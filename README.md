#  WaitLess - Smart Hospital OPD Queue System

##  Problem
Patients in government hospitals wait 4+ hours for a 3-minute consultation. 
No system tells them when to arrive or how long to wait.

##  Features
-  Book virtual tokens from home
-  Live queue position (like Dominos tracker)
-  AI-predicted wait times
-  SMS alerts when 3 patients ahead  
-  Doctor panel to manage queue
-  Admin analytics dashboard
-  Real-time updates via Socket.io
-  Mobile-first, works on 2G

##  Tech Stack
**Frontend:** Next.js 14, Tailwind CSS, Socket.io-client  
**Backend:** Node.js, Express, Socket.io, Prisma ORM  
**Database:** PostgreSQL, Redis  
**Auth:** JWT, bcrypt

##  Local Setup
```bash
# Start databases
docker-compose up -d

# Backend
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

##  Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Database:** PostgreSQL on localhost:5432

##  Demo Accounts
```
Admin:    9999999999 / admin123
Doctor:   8888888888 / doctor123
Patient:  Register new account
```

##  Dashboard Access
- **Patient:** /patient - Book tokens, track position
- **Doctor:** /doctor - Manage queue, call patients
- **Admin:** /admin - Analytics, load balancing

##  Key Features

###  Patient Experience
-  Book tokens from phone
-  See real-time position in queue
-  Get estimated wait time
-  Receive "your turn" notifications
-  Track consultation history

###  Doctor Tools
-  View waiting queue
-  Call next patient with one click
-  Skip patients if needed
-  Track completed consultations
-  Manage daily schedule

###  Admin Analytics
-  Real-time hospital statistics
-  Load balancing suggestions
-  Queue performance metrics
-  Doctor productivity tracking
-  System health monitoring

##  Real-time Features
All dashboards update live via Socket.io:
-  Queue position changes
-  Patient call notifications
-  Doctor availability
-  Statistics updates
-  Load balancing alerts

##  Database Schema
- **Users**: Patients, doctors, admins
- **Hospitals**: Hospital information
- **Doctors**: Specializations, availability
- **Tokens**: Queue appointments with status

##  API Endpoints
```
Authentication: /api/auth/register, /api/auth/login
Hospitals:     /api/hospitals
Doctors:       /api/doctors, /api/doctors/:id
Tokens:        /api/tokens/book, /api/tokens/queue/:id, /api/tokens/my
```

##  Environment Variables

### Backend (.env)
```
PORT=5000
DATABASE_URL="postgresql://waitless:waitless123@localhost:5432/waitless_db"
JWT_SECRET="changeme_secret_key_2024"
CLIENT_URL="http://localhost:3000"  # For production CORS
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

##  Production Deployment

### Docker Production
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
1. Set production DATABASE_URL
2. Generate secure JWT_SECRET
3. Configure CLIENT_URL for CORS
4. Set up SSL certificates
5. Configure reverse proxy (nginx)

##  Architecture Highlights
-  Microservices design with separate frontend/backend
-  Real-time communication via WebSockets
-  Scalable database design with Prisma ORM
-  Mobile-first responsive design
-  Role-based access control
-  Secure JWT authentication

##  Performance Features
-  Redis for session management
-  Optimized database queries
-  Lazy loading for large datasets
-  Efficient Socket.io rooms
-  Minimal bundle sizes

##  Security
-  JWT token authentication
-  Password hashing with bcrypt
-  CORS configuration
-  Input validation
-  SQL injection prevention
-  XSS protection

##  Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

##  License
MIT License - see LICENSE file for details

---

**Built with  for better healthcare accessibility**
