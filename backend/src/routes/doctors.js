const express = require('express');
const router = express.Router();

// Get Prisma client from app
const getPrisma = (req) => req.app.get('prisma');

// GET /api/doctors
router.get('/', async (req, res) => {
  try {
    const prisma = getPrisma(req);
    
    const doctors = await prisma.doctor.findMany({
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Server error while fetching doctors' });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma(req);
    
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Server error while fetching doctor' });
  }
});

module.exports = router;
