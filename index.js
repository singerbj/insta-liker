/* eslint-disable no-await-in-loop */
// Packages
const Instagram = require('instagram-web-api');
const FileCookieStore = require('tough-cookie-filestore2');
const moment = require('moment');
const hashtags = require('./hashtags');

// eslint-disable-next-line camelcase
const { insta_u, insta_p } = process.env; // Only required when no cookies are stored yet

const cookieStore = new FileCookieStore('./cookies.json');
const client = new Instagram({ username: insta_u, password: insta_p, cookieStore });
// const sleepTime = 1000;
const minBreakMs = 600000;
const maxBreakMs = 1200000;
const minWatchTimeMs = 750;
const maxWatchTimeMs = 10000;
const pollForNewDayMs = 10000;
const minPostsToView = 30;
const maxPostsToView = 45;

const rand = (min, max) => {
    const adjustedMin = Math.ceil(min);
    const adjustedMax = Math.floor(max);
    return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1) + adjustedMin);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        await callback(array[index], index, array);
    }
};

(async () => {
    try {
        // login if needed
        try {
            console.log('Logging in...');
            await client.login();
        } catch (e) {
            console.log("Login wasn't needed - moving on...");
        }

        while (true) {
            // get posts
            const postsToLike = [];
            await asyncForEach(hashtags, async (hashtag) => {
                const lowercaseHashtag = hashtag.toLowerCase();
                console.log(`Getting media for hashtag: ${lowercaseHashtag}`);
                const result = await client.getPhotosByHashtag({ hashtag: lowercaseHashtag });
                if (result && result.hashtag && result.hashtag.edge_hashtag_to_media.edges) {
                    result.hashtag.edge_hashtag_to_media.edges.forEach((post) => {
                        if (post && post.node) {
                            postsToLike.push(post.node);
                        }
                    });
                }
                console.log(`Number of posts to like: ${postsToLike.length}`);
                // console.log(`Sleeping for ${sleepTime / 1000} seconds.`);
                // await sleep(sleepTime);
            });

            // like posts
            let currentlyLikedPosts = 0;
            const numberOfPostsToLike = rand(minPostsToView, maxPostsToView);
            await asyncForEach(postsToLike, async (post) => {
                const currentTimeAfter6Am = moment().isAfter(moment('6:00 AM', 'h:mm A'));
                const currentTimeBefore10Am = moment().isBefore(moment('10:00 PM', 'h:mm A'));
                if (currentTimeAfter6Am && currentTimeBefore10Am) {
                    if (currentlyLikedPosts < numberOfPostsToLike) {
                        if (post && post.id) {
                            const postWatchTime = rand(minWatchTimeMs, maxWatchTimeMs);
                            console.log(`Watching post for ${postWatchTime / 1000} seconds.`);
                            await sleep(postWatchTime);
                            try {
                                await client.like({ mediaId: post.id });
                                currentlyLikedPosts += 1;
                                console.log(`Liked post ${currentlyLikedPosts} / ${numberOfPostsToLike}!`);
                            } catch (e) {
                                console.log(`Error liking post: ${post.id}`);
                                console.error(e);
                            }
                        } else {
                            console.log('Problem with post - skipping...');
                        }
                    } else {
                        const breakTime = rand(minBreakMs, maxBreakMs);
                        console.log(`Taking a break for ${breakTime / 1000 / 60} minutes. (Back at ${new Date(Date.now() + breakTime).toLocaleTimeString()})`);
                        currentlyLikedPosts = 0;
                        await sleep(breakTime);
                    }
                } else {
                    console.log('After hours - skipping liking...');
                    await sleep(pollForNewDayMs);
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
})();
