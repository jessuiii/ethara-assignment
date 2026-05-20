/**
 * Seed script — creates test users, projects, and tasks for demo purposes.
 *
 * Run: node server/seed.js
 */
require('dotenv').config();

const { sequelize, User, Project, ProjectMember, Task } = require('./models');

const USERS = [
  { name: 'Alice Johnson',  email: 'alice@ethara.com',  password: 'password123' },
  { name: 'Bob Smith',      email: 'bob@ethara.com',    password: 'password123' },
  { name: 'Carol Williams', email: 'carol@ethara.com',  password: 'password123' },
  { name: 'David Lee',      email: 'david@ethara.com',  password: 'password123' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database');

    // Sync schema (safe — alter only adds missing columns/tables)
    await sequelize.sync({ alter: true });

    // ── Create Users ──
    console.log('\nCreating users...');
    const users = [];
    for (const u of USERS) {
      const [user] = await User.findOrCreate({
        where: { email: u.email },
        defaults: { name: u.name, password_hash: u.password },
      });
      users.push(user);
      console.log(`  ✓ ${user.name} (${user.email})`);
    }

    const [alice, bob, carol, david] = users;

    // ── Create Projects ──
    console.log('\nCreating projects...');

    // Project 1: Website Redesign (Alice is admin)
    const [project1] = await Project.findOrCreate({
      where: { name: 'Website Redesign' },
      defaults: { description: 'Complete overhaul of the company website with modern design and improved UX.', created_by: alice.id },
    });
    console.log(`  ✓ ${project1.name}`);

    // Project 2: Mobile App (Bob is admin)
    const [project2] = await Project.findOrCreate({
      where: { name: 'Mobile App Launch' },
      defaults: { description: 'Build and launch the iOS and Android mobile application by Q3.', created_by: bob.id },
    });
    console.log(`  ✓ ${project2.name}`);

    // Project 3: API Integration (Alice is admin)
    const [project3] = await Project.findOrCreate({
      where: { name: 'API Integration' },
      defaults: { description: 'Integrate third-party payment and analytics APIs into the platform.', created_by: alice.id },
    });
    console.log(`  ✓ ${project3.name}`);

    // ── Add Members ──
    console.log('\nAdding members...');
    const memberships = [
      // Project 1: Alice (admin), Bob (member), Carol (member)
      { project_id: project1.id, user_id: alice.id, role: 'admin' },
      { project_id: project1.id, user_id: bob.id,   role: 'member' },
      { project_id: project1.id, user_id: carol.id, role: 'member' },

      // Project 2: Bob (admin), Alice (member), David (member)
      { project_id: project2.id, user_id: bob.id,   role: 'admin' },
      { project_id: project2.id, user_id: alice.id, role: 'member' },
      { project_id: project2.id, user_id: david.id, role: 'member' },

      // Project 3: Alice (admin), Carol (member), David (member)
      { project_id: project3.id, user_id: alice.id, role: 'admin' },
      { project_id: project3.id, user_id: carol.id, role: 'member' },
      { project_id: project3.id, user_id: david.id, role: 'member' },
    ];

    for (const m of memberships) {
      await ProjectMember.findOrCreate({
        where: { project_id: m.project_id, user_id: m.user_id },
        defaults: m,
      });
    }
    console.log('  ✓ All members added');

    // ── Create Tasks ──
    console.log('\nCreating tasks...');

    const today = new Date();
    const daysFromNow = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const tasks = [
      // ── Project 1: Website Redesign ──
      { project_id: project1.id, title: 'Design new homepage mockup',      description: 'Create high-fidelity mockups for the landing page with hero section, features grid, and testimonials.',              status: 'done',        priority: 'high',   due_date: daysFromNow(-3),  assigned_to: alice.id, created_by: alice.id },
      { project_id: project1.id, title: 'Set up CI/CD pipeline',           description: 'Configure GitHub Actions for automated testing and deployment to staging.',                                          status: 'done',        priority: 'medium', due_date: daysFromNow(-5),  assigned_to: bob.id,   created_by: alice.id },
      { project_id: project1.id, title: 'Implement responsive navbar',     description: 'Build the navigation bar component with mobile hamburger menu and smooth transitions.',                               status: 'in_progress', priority: 'high',   due_date: daysFromNow(2),   assigned_to: bob.id,   created_by: alice.id },
      { project_id: project1.id, title: 'Write API documentation',         description: 'Document all REST endpoints with request/response examples using Swagger.',                                             status: 'in_progress', priority: 'medium', due_date: daysFromNow(5),   assigned_to: carol.id, created_by: alice.id },
      { project_id: project1.id, title: 'Create contact form',             description: 'Build the contact form with email validation and integrate with SendGrid.',                                              status: 'todo',        priority: 'low',    due_date: daysFromNow(7),   assigned_to: carol.id, created_by: alice.id },
      { project_id: project1.id, title: 'Performance optimization',        description: 'Audit and optimize page load times — target < 2s LCP.',                                                                  status: 'todo',        priority: 'high',   due_date: daysFromNow(10),  assigned_to: null,     created_by: alice.id },
      { project_id: project1.id, title: 'Cross-browser testing',           description: 'Test all pages on Chrome, Firefox, Safari, and Edge. Log any rendering issues.',                                         status: 'todo',        priority: 'medium', due_date: daysFromNow(-1),  assigned_to: bob.id,   created_by: alice.id },

      // ── Project 2: Mobile App Launch ──
      { project_id: project2.id, title: 'Set up React Native project',     description: 'Initialize the React Native project with TypeScript, navigation, and state management.',                                status: 'done',        priority: 'high',   due_date: daysFromNow(-10), assigned_to: bob.id,   created_by: bob.id },
      { project_id: project2.id, title: 'Design app onboarding flow',      description: 'Create the 3-screen onboarding carousel with illustrations and skip option.',                                            status: 'done',        priority: 'medium', due_date: daysFromNow(-7),  assigned_to: alice.id, created_by: bob.id },
      { project_id: project2.id, title: 'Implement push notifications',    description: 'Integrate Firebase Cloud Messaging for iOS and Android push notifications.',                                              status: 'in_progress', priority: 'high',   due_date: daysFromNow(3),   assigned_to: david.id, created_by: bob.id },
      { project_id: project2.id, title: 'Build user profile screen',       description: 'Profile screen with avatar upload, name editing, and password change.',                                                   status: 'in_progress', priority: 'medium', due_date: daysFromNow(4),   assigned_to: alice.id, created_by: bob.id },
      { project_id: project2.id, title: 'App Store submission prep',       description: 'Prepare screenshots, descriptions, and metadata for App Store and Play Store listings.',                                  status: 'todo',        priority: 'high',   due_date: daysFromNow(14),  assigned_to: bob.id,   created_by: bob.id },
      { project_id: project2.id, title: 'Beta testing round',              description: 'Distribute beta build to 20 testers via TestFlight and gather feedback.',                                                 status: 'todo',        priority: 'medium', due_date: daysFromNow(12),  assigned_to: david.id, created_by: bob.id },

      // ── Project 3: API Integration ──
      { project_id: project3.id, title: 'Research payment gateways',       description: 'Compare Stripe, Razorpay, and PayPal — document pricing, features, and integration complexity.',                          status: 'done',        priority: 'high',   due_date: daysFromNow(-8),  assigned_to: alice.id, created_by: alice.id },
      { project_id: project3.id, title: 'Stripe checkout integration',     description: 'Implement Stripe Checkout session creation and webhook handling for payment confirmation.',                                status: 'in_progress', priority: 'high',   due_date: daysFromNow(1),   assigned_to: carol.id, created_by: alice.id },
      { project_id: project3.id, title: 'Analytics dashboard setup',       description: 'Integrate Mixpanel for event tracking and build an internal analytics dashboard.',                                         status: 'todo',        priority: 'medium', due_date: daysFromNow(8),   assigned_to: david.id, created_by: alice.id },
      { project_id: project3.id, title: 'Rate limiting middleware',        description: 'Add express-rate-limit to protect API endpoints from abuse. Configure per-route limits.',                                  status: 'todo',        priority: 'low',    due_date: daysFromNow(15),  assigned_to: null,     created_by: alice.id },
    ];

    for (const t of tasks) {
      await Task.findOrCreate({
        where: { project_id: t.project_id, title: t.title },
        defaults: t,
      });
    }
    console.log(`  ✓ ${tasks.length} tasks created`);

    // ── Summary ──
    console.log('\n════════════════════════════════════════');
    console.log('  SEED COMPLETE — Test Accounts');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('  All accounts use password: password123');
    console.log('');
    console.log('  ┌─────────────────────┬─────────────────────┬───────────────────────┐');
    console.log('  │ Name                │ Email               │ Role (varies by proj) │');
    console.log('  ├─────────────────────┼─────────────────────┼───────────────────────┤');
    console.log('  │ Alice Johnson       │ alice@ethara.com    │ Admin on 2 projects   │');
    console.log('  │ Bob Smith           │ bob@ethara.com      │ Admin on 1 project    │');
    console.log('  │ Carol Williams      │ carol@ethara.com    │ Member only           │');
    console.log('  │ David Lee           │ david@ethara.com    │ Member only           │');
    console.log('  └─────────────────────┴─────────────────────┴───────────────────────┘');
    console.log('');
    console.log('  Projects: Website Redesign, Mobile App Launch, API Integration');
    console.log('  Tasks: 17 total (various statuses, priorities, and due dates)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('✗ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
