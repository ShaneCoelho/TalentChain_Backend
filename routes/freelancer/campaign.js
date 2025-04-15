const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const multer = require('multer');
const Users = mongoose.model('Users');


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



module.exports = router