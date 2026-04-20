const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get Prisma client from app
const getPrisma = (req) => req.app.get('prisma');

// Helper function to get today's start
const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// POST /api/tokens/book (AUTH required)
router.post('/book', auth, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    const prisma = getPrisma(req);
    const today = getTodayStart();

    // Check if user already has an active token today for this doctor
    const existingToken = await prisma.token.findFirst({
      where: {
        patientId,
        doctorId,
        bookedAt: {
          gte: today,
        },
        status: {
          in: ['waiting', 'called'],
        },
      },
    });

    if (existingToken) {
      return res.status(400).json({ 
        error: 'You already have an active token for this doctor today',
        existingToken 
      });
    }

    // Count today's tokens for this doctor
    const todayTokensCount = await prisma.token.count({
      where: {
        doctorId,
        bookedAt: {
          gte: today,
        },
      },
    });

    const newTokenNumber = todayTokensCount + 1;

    // Create new token
    const token = await prisma.token.create({
      data: {
        tokenNumber: newTokenNumber,
        patientId,
        doctorId,
        status: 'waiting',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // Emit queue update event
    const io = req.app.get('io');
    io.emit('queue-updated', { doctorId });

    res.status(201).json(token);
  } catch (error) {
    console.error('Error booking token:', error);
    res.status(500).json({ error: 'Server error while booking token' });
  }
});

// GET /api/tokens/queue/:doctorId (PUBLIC)
router.get('/queue/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const prisma = getPrisma(req);
    const today = getTodayStart();

    const tokens = await prisma.token.findMany({
      where: {
        doctorId,
        bookedAt: {
          gte: today,
        },
      },
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        tokenNumber: 'asc',
      },
    });

    res.json(tokens);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Server error while fetching queue' });
  }
});

// GET /api/tokens/my (AUTH required)
router.get('/my', auth, async (req, res) => {
  try {
    const patientId = req.user.id;
    const prisma = getPrisma(req);
    const today = getTodayStart();

    const tokens = await prisma.token.findMany({
      where: {
        patientId,
        bookedAt: {
          gte: today,
        },
      },
      include: {
        doctor: {
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookedAt: 'desc',
      },
    });

    res.json(tokens);
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    res.status(500).json({ error: 'Server error while fetching your tokens' });
  }
});

// POST /api/tokens/call-next (AUTH required)
router.post('/call-next', auth, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const prisma = getPrisma(req);
    const today = getTodayStart();

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    // Update all 'called' tokens to 'completed'
    await prisma.token.updateMany({
      where: {
        doctorId,
        status: 'called',
        bookedAt: {
          gte: today,
        },
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Find next 'waiting' token
    const nextToken = await prisma.token.findFirst({
      where: {
        doctorId,
        status: 'waiting',
        bookedAt: {
          gte: today,
        },
      },
      orderBy: {
        tokenNumber: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    if (!nextToken) {
      return res.json({ message: 'No more patients in queue' });
    }

    // Update token to 'called'
    const updatedToken = await prisma.token.update({
      where: { id: nextToken.id },
      data: {
        status: 'called',
        calledAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // Emit queue update event
    const io = req.app.get('io');
    io.emit('queue-updated', { doctorId });

    res.json(updatedToken);
  } catch (error) {
    console.error('Error calling next token:', error);
    res.status(500).json({ error: 'Server error while calling next token' });
  }
});

// POST /api/tokens/skip/:id (AUTH required)
router.post('/skip/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma(req);

    // Find the token
    const token = await prisma.token.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Update token status to 'missed'
    const updatedToken = await prisma.token.update({
      where: { id },
      data: {
        status: 'missed',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // Emit queue update event
    const io = req.app.get('io');
    io.emit('queue-updated', { doctorId: token.doctor.id });

    res.json(updatedToken);
  } catch (error) {
    console.error('Error skipping token:', error);
    res.status(500).json({ error: 'Server error while skipping token' });
  }
});

module.exports = router;
