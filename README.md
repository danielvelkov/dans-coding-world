# DansCodingWorld

A task project for The Odin Project (TOP).
A basic blog full stack app with an express backend and two React front ends:

- one for the author(s) writing the posts
- one for the readers

## Architecture

This is a monorepo containing:

Backend: REST API built with Express
Frontend 1 - Public Blog: Web app built with React
Frontend 2 - Blog Editor: Web app built with React
Database: PostgreSQL

## Data-model

- User - can have one of these roles:

  - `ADMIN` can:
    - create/edit/delete all posts
    - create/delete all comments
    - delete users (except other admins)
    - get/edit/delete reports on comments
    - revoke all refresh tokens
    - ban users except other admins
    - change user role
    - create/edit/delete all tags
  - `MOD` can:
    - create/delete all comments
    - get/edit reports on comments
    - revoke user refresh tokens
    - ban users except other mods/admins
  - `AUTHOR` - can:
    - create/edit/delete own posts
    - create/edit/delete all tags
  - `USER` and all other roles - can:
    - edit own profile and change password
    - create/edit/delete own comments
    - issue reports on comments

- Profile - each user has 1 profile. Profile is not required user to register

- RefreshToken - used in JWT authentication

- Post - depending on visibility can be:

  - `PUBLIC`: available for everyone, even guest users
  - `MEMBERS_ONLY`: available only for registered users

  Depending on status can be:

  - `DRAFT`: can be accessed only by the author (_\*and admins_)
  - `PUBLISHED`: can be accessed by everyone (\*_depends on visibility_)
  - `ARCHIVED`: can be access only by the author (_\*and admins_)

- Tag - post can have 0 or many tags

- Comment: any user can comment on a given post. Cannot comment on non-published posts when not the author of the post

- Report: represents the reports made for a comment. Users cannot report their own comments. Cannot be made on non-published posts when not the author of the post

## Project Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (for database functionality)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/danielvelkov/dans-coding-world.git
   cd dans-coding-world
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

3. Create environment variables:

   ```sh
   # Create a .env file in the root and \tools directory
   # Add necessary environment variables for database connection
   # See tools\.env.example
   ```

4. Set up the database:

   ```sh
   # If you already have the DB you can skip this step
   npx nx create-db
   ```
