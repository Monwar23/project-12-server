# Pet Adoption Website

## Live Link: https://loving-pets.netlify.app/

## Description :

The Pet Adoption Platform is a comprehensive web application designed to facilitate pet adoption and donation campaigns. It features a user-friendly interface with a 3-column grid layout for browsing available pets, enhanced by search and category filters. Each pet's profile page includes detailed information and an integrated adoption form that pre-fills with user and pet data for easy submission and database storage. The platform also includes an infinite-scrolling Donation Campaigns Page, displaying ongoing campaigns with details like pet names, images, donation goals, and current donations, alongside an "Adopt" button. Robust authentication supports email/password login, social logins (Google, Facebook, GitHub), and JWT for secure access control, distinguishing between user and admin roles. User and admin dashboards offer functionalities for managing pets, adoption requests, donation campaigns, and user roles, ensuring smooth operation and administration of the platform.

## Run server site after [client-side](https://github.com/Monwar23/projects-12-client)

- git clone
- npm install
- create .env file
- update .env to : 
  - DB_USER=Your Mongodb user
  - DB_PASS=Your Mongodb password
  - ACCESS_TOKEN_SECRET=Your token
  - STRIPE_SECRET_KEY=your stipe key
- nodemon index.js and run this
