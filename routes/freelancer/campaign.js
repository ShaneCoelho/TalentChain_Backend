const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const multer = require('multer');
const Users = mongoose.model('Users');
const { createClient } = require('redis');

const redisClient = createClient();
redisClient.connect().catch(console.error);


router.post('/explore-campaigns', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.body; // Get page & limit from request
        const skip = (page - 1) * limit;

        // Fetch only necessary fields
        const campaigns = await Users.find({ role: "startup" })
            .select("image name campaigns")
            .slice("campaigns", [skip, limit]); // Slice campaigns at DB level

        let campaignArray = [];

        campaigns.forEach(campaign => {
            campaign.campaigns.forEach(camp => {
                campaignArray.push({
                    startupImage: campaign.image,
                    campaignName: camp.name,
                    startupName: campaign.name,
                    campaignStartDate: camp.start_date,
                    campaignBudget: camp.prize,
                    startupId: campaign._id,
                    campaignId: camp._id,
                    skills: camp.skills
                });
            });
        });

        const totalCampaigns = await Users.aggregate([
            { $match: { role: "startup" } },
            { $unwind: "$campaigns" },
            { $count: "total" }
        ]);

        const totalRecords = totalCampaigns.length > 0 ? totalCampaigns[0].total : 0;
        const hasNextPage = skip + limit < totalRecords;

        res.send({
            campaigns: campaignArray,
            nextPage: hasNextPage ? page + 1 : null
        });

    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

router.post('/explore-campaigns-redis', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.body;
    const skip = (page - 1) * limit;

    // Step 1: Check if Redis has campaigns
    const redisCampaignIds = await redisClient.lRange('campaigns:list', 0, -1);
    let campaignArray = [];

    if (redisCampaignIds.length > 0) {
      const start = skip;
      const end = skip + limit;

      const redisSlice = redisCampaignIds.slice(start, end);

      for (const campaignId of redisSlice) {
        const cachedData = await redisClient.get(`campaigns:${campaignId}`);
        if (cachedData) {
          campaignArray.push(JSON.parse(cachedData));
        }
      }

      console.log("From redis")

      // If Redis didn't have enough to fill the page, fetch rest from MongoDB
      if (campaignArray.length < limit) {
        const remaining = limit - campaignArray.length;
        const mongoSkip = Math.max(0, skip - redisCampaignIds.length);

        const dbCampaigns = await Users.find({ role: "startup" })
          .select("image name campaigns")
          .slice("campaigns", [mongoSkip, remaining]);

        dbCampaigns.forEach(campaign => {
          campaign.campaigns.forEach(camp => {
            campaignArray.push({
              startupImage: campaign.image,
              campaignName: camp.name,
              startupName: campaign.name,
              campaignStartDate: camp.start_date,
              campaignBudget: camp.prize,
              startupId: campaign._id,
              campaignId: camp._id,
              skills: camp.skills
            });
          });
        });
      }
    } else {
      // Redis is empty, fallback to MongoDB for the whole request
      const campaigns = await Users.find({ role: "startup" })
        .select("image name campaigns")
        .slice("campaigns", [skip, limit]);

      campaigns.forEach(campaign => {
        campaign.campaigns.forEach(camp => {
          campaignArray.push({
            startupImage: campaign.image,
            campaignName: camp.name,
            startupName: campaign.name,
            campaignStartDate: camp.start_date,
            campaignBudget: camp.prize,
            startupId: campaign._id,
            campaignId: camp._id,
            skills: camp.skills
          });
        });
      });
    }

    // Step 2: Determine total campaign count (still needed for pagination)
    const totalCampaigns = await Users.aggregate([
      { $match: { role: "startup" } },
      { $unwind: "$campaigns" },
      { $count: "total" }
    ]);

    const totalRecords = totalCampaigns.length > 0 ? totalCampaigns[0].total : 0;
    const hasNextPage = skip + limit < totalRecords;

    res.send({
      campaigns: campaignArray,
      nextPage: hasNextPage ? page + 1 : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Internal server error" });
  }
});


//Create a route which receives the campaign id and startup id and returns the campaign details to the frontend.
// router.post('/campaign-details', async (req, res) => {
//     try {
//         const { startupId, campaignId } = req.body;
//         const startup = await Users.findById(startupId);
//         let campaign;
//         startup.campaigns.forEach(camp => {
//             if (camp._id == campaignId) {
//                 campaign = camp;
//             }
//         });
//         res.send(campaign);
//     } catch (err) {
//         return res.status(500).send({ error: "Internal server error" });
//     }
// })

//Create a express route which receives the campaign id and startup id and returns the campaign details along with the startup name and image to the frontend.


router.post('/campaign-details', async (req, res) => {
    try {
        const { startupId, campaignId } = req.body;

        // Find the startup by ID
        const startup = await Users.findById(startupId).select("name image campaigns");
        if (!startup) {
            return res.status(404).send({ error: "Startup not found" });
        }

        // Find the campaign within the startup's campaigns
        const campaign = startup.campaigns.find(camp => camp._id.toString() === campaignId);
        if (!campaign) {
            return res.status(404).send({ error: "Campaign not found" });
        }

        // Return campaign details along with startup name and image
        res.send({
            campaignDetails: campaign,
            startupName: startup.name,
            startupImage: startup.image
        });
    } catch (err) {
        console.error('Error in /campaign-details:', err);
        return res.status(500).send({ error: "Internal server error" });
    }
});




//Create a route which receives campaign id, startup id and freelancer id and adds the freelancer to the interested array of the campaign.
router.post('/show-interest', fetchusers, async (req, res) => {
    try {
        const { startupId, campaignId } = req.body;
        const freelancerId = req.user.id;
        const startup = await Users.findById(startupId);
        let campaign;
        startup.campaigns.forEach(camp => {
            if (camp._id == campaignId) {
                camp.interested.push(freelancerId);
                campaign = camp;
            }
        });

        // It should also save the campaign id and startupId in the applied_campaigns array of the freelancer.
        const freelancer = await Users.findById(freelancerId);
        let appliedCampaign = {
            campaignId: campaignId,
            startupId: startupId
        };
        freelancer.applied_campaigns.push(appliedCampaign);
        freelancer.save();
        await startup.save();
        res.send(campaign);
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
})

//create a route which receives the user id and returns all the details like name, start date, prize, status, startup id and campaign id  of  applied campaigns of the user.
// router.post('/applied-campaigns', fetchusers, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const user = await Users.findById(userId);
//         let appliedCampaigns = [];

//         user.applied_campaigns.forEach(camp => {
//             let campaign = user.campaigns.find(c => c._id == camp.campaignId);
//             if (campaign) {
//                 appliedCampaigns.push({
//                     startupId: camp.startupId,
//                     campaignId: campaign._id,
//                     name: campaign.name,
//                     start_date: campaign.start_date,
//                     prize: campaign.prize,
//                     status: campaign.status
//                 });
//             }
//         });
//         res.send(appliedCampaigns);
//     } catch (err) {
//         return res.status(500).send({ error: "Internal server error" });
//     }
// })

router.post('/applied-campaigns', fetchusers, async (req, res) => {
    try {
        const freelancerId = req.user.id;

        // Find the freelancer by ID
        const freelancer = await Users.findById(freelancerId).select("applied_campaigns");
        if (!freelancer) {
            return res.status(404).send({ error: "Freelancer not found" });
        }

        let appliedCampaignsDetails = [];

        // Loop through applied campaigns and fetch details
        for (const applied of freelancer.applied_campaigns) {
            const startup = await Users.findById(applied.startupId).select("campaigns");
            if (startup) {
                const campaign = startup.campaigns.find(camp => camp._id.toString() === applied.campaignId);
                if (campaign) {
                    appliedCampaignsDetails.push({
                        startupId: applied.startupId,
                        campaignId: applied.campaignId,
                        name: campaign.name,
                        start_date: campaign.start_date,
                        prize: campaign.prize,
                        status: campaign.status
                    });
                }
            }
        }

        res.send(appliedCampaignsDetails);
    } catch (err) {
        console.error('Error in /freelancer-applied-campaigns:', err);
        return res.status(500).send({ error: "Internal server error" });
    }
});

//create a route which receives the startup id and campaign id and returns the entire details of the campaign excluding the interested and assigned users.
router.post('/assigned-campaign-details', async (req, res) => {
    try {
        const { startupId, campaignId } = req.body;
        const startup = await Users.findById(startupId);
        let campaign;
        startup.campaigns.forEach(camp => {
            if (camp._id == campaignId) {
                campaign = camp;
            }
        });
        res.send(campaign);
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
})

//create a route which receives the user id and returns all the details like name, start date, prize, status, startup id and campaign id  of  assigned campaigns of the user.
// router.post('/assigned-campaigns', fetchusers, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const user = await Users.findById(userId);
//         let assignedCampaigns = [];

//         user.assigned_campaigns.forEach(camp => {
//             let campaign = user.campaigns.find(c => c._id == camp.campaignId);
//             if (campaign) {
//                 assignedCampaigns.push({
//                     startupId: camp.startupId,
//                     campaignId: campaign._id,
//                     name: campaign.name,
//                     start_date: campaign.start_date,
//                     prize: campaign.prize,
//                     status: campaign.status
//                 });
//             }
//         });
//         res.send(assignedCampaigns);
//     } catch (err) {
//         return res.status(500).send({ error: "Internal server error" });
//     }
// })

router.post('/assigned-campaigns', fetchusers, async (req, res) => {
    try {
        const freelancerId = req.user.id;

        // Find the freelancer by ID
        const freelancer = await Users.findById(freelancerId).select("assigned_campaigns");
        if (!freelancer) {
            return res.status(404).send({ error: "Freelancer not found" });
        }

        let assignedCampaignsDetails = [];

        // Loop through assigned campaigns and fetch details
        for (const assigned of freelancer.assigned_campaigns) {
            const startup = await Users.findById(assigned.startupId).select("campaigns");
            if (startup) {
                const campaign = startup.campaigns.find(camp => camp._id.toString() === assigned.campaignId);
                if (campaign) {
                    assignedCampaignsDetails.push({
                        startupId: assigned.startupId,
                        campaignId: assigned.campaignId,
                        name: campaign.name,
                        start_date: campaign.start_date,
                        prize: campaign.prize,
                        status: campaign.status
                    });
                }
            }
        }

        res.send(assignedCampaignsDetails);
    } catch (err) {
        console.error('Error in /freelancer-assigned-campaigns:', err);
        return res.status(500).send({ error: "Internal server error" });
    }
});

//create a route which receives the startup id, campaign id and freelancer id and adds the freelancer id to the approval array of the campaign

router.post('/send-for-approval', fetchusers, async (req, res) => {
    try {
      const { startupId, campaignId } = req.body;
      const startup = await Users.findById(startupId);
      if (!startup) {
        return res.status(404).send({ error: "Startup not found" });
      }
  
      let campaign;
      startup.campaigns.forEach(camp => {
        if (camp._id.toString() === campaignId) {
        //   if (!camp.approval) camp.approval = [];
          camp.approval.push(req.user.id);
          campaign = camp;
        }
      });
  
      if (!campaign) {
        return res.status(404).send({ error: "Campaign not found" });
      }
  
      await startup.save();
      res.send(campaign);
    } catch (err) {
      console.error('Error in /send-for-approval:', err);
      return res.status(500).send({ error: "Internal server error" });
    }
  });

  //create a route which receives freelancer id and returns rewardsreceived array.

router.post('/rewards-received', fetchusers, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await Users.findById(userId).select("rewardsreceived");
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }
        res.send(user.rewardsreceived);
    } catch (err) {
        console.error('Error in /rewards-received:', err);
        return res.status(500).send({ error: "Internal server error" });
    }
}
);

router.post('/freelancer-stats', fetchusers, async (req, res) => {
    try {
        const freelancerId = req.user.id;

        // Fetch the freelancer by ID and select the required fields
        const freelancer = await Users.findById(freelancerId).select("rewardsreceived assigned_campaigns");
        if (!freelancer) {
            return res.status(404).send({ error: "Freelancer not found" });
        }

        // Calculate the stats
        const completedCampaigns = freelancer.rewardsreceived.length;
        const totalRewards = freelancer.rewardsreceived.reduce((sum, reward) => sum + (reward.prize || 0), 0);
        const assignedCampaignsCount = freelancer.assigned_campaigns.length;

        // Send the response
        res.status(200).json({
            completedCampaigns,
            totalRewards,
            assignedCampaignsCount
        });
    } catch (err) {
        console.error('Error in /freelancer-stats:', err);
        return res.status(500).send({ error: "Internal server error" });
    }
});



module.exports = router