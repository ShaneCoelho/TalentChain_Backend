const express = require('express')
const mongoose = require('mongoose')
const Users = mongoose.model('Users');
const cron = require('node-cron');
const { createClient } = require('redis');

// Redis setup
const redisClient = createClient();
redisClient.connect().catch(console.error);

cron.schedule('* * * * *', async () => {
    try {
        console.log('Cron job running to update Redis cache...');

        const limit = 10;

        const startups = await Users.find({ role: "startup" })
            .select("image name campaigns")
            .slice("campaigns", [0, limit]);

        let campaignArray = [];

        startups.forEach(startup => {
            startup.campaigns.forEach(camp => {
                campaignArray.push({
                    startupImage: startup.image,
                    campaignName: camp.name,
                    startupName: startup.name,
                    campaignStartDate: camp.start_date,
                    campaignBudget: camp.prize,
                    startupId: startup._id.toString(),
                    campaignId: camp._id.toString(),
                    skills: camp.skills
                });
            });
        });

        // Take only the first 10 campaigns
        campaignArray = campaignArray.slice(0, limit);

        // Clear old cache
        // Step 1: Get existing cached campaign IDs
        const oldCampaignIds = await redisClient.lRange('campaigns:list', 0, -1);

        // Step 2: Delete each individual campaign:<id> key
        if (oldCampaignIds.length > 0) {
            const deleteKeys = oldCampaignIds.map(id => `campaigns:${id}`);
            await redisClient.del(deleteKeys);
        }

        // Step 3: Delete the campaigns:list
        await redisClient.del('campaigns:list');

        // Step 4: Store updated list and campaigns as before
        const campaignIds = campaignArray.map(c => c.campaignId);
        if (campaignIds.length > 0) {
            await redisClient.rPush('campaigns:list', campaignIds);
        }

        for (let campaign of campaignArray) {
            await redisClient.set(`campaigns:${campaign.campaignId}`, JSON.stringify(campaign));
        }


        console.log(`Updated ${campaignArray.length} campaigns in Redis`);

    } catch (err) {
        console.error('Cron job failed:', err);
    }
});
