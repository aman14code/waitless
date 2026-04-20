const express = require('express');
const router = express.Router();

// Get Prisma client from app
const getPrisma = (req) => req.app.get('prisma');

// GET /api/hospitals
router.get('/', async (req, res) => {
  try {
    const prisma = getPrisma(req);
    
    const hospitals = await prisma.hospital.findMany({
      include: {
        doctors: {
          select: {
            id: true,
            name: true,
            specialization: true,
            avgConsultMin: true,
            available: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Server error while fetching hospitals' });
  }
});

module.exports = router;
