# DansCodingWorld

A task project for The Odin Project (TOP).
A basic blog full stack app with an express backend and two front ends:

- one for the author(s) writing the posts, the moderators and admins (blog-admin)
- one for the readers (public-blog)

You can comment and report comments in case they are inappropriate.
Moderators can then log onto the blog-admin app and take action.

Whats the point of adding content moderation to this simple blog project?

Idk, it seemed nice to have at the beginning, but now I regret it immensely.
At its current state it doesn't even work properly.

## Architecture

This is a monorepo containing:

- Backend: REST API built with Express
- Frontend 1 - Public Blog: Web app built with React
- Frontend 2 - Blog Editor: Web app built with Svelte-kit

- Database: PostgreSQL
- Image storage: Cloudinary

## Data-model

- User - can have one of these roles:
  - `ADMIN` can:
    - get/create/edit/delete all posts
    - create/delete all comments
    - get/delete all users (except other admins)
    - get/edit/delete all reports on comments
    - revoke all refresh tokens
    - ban users (except other admins)
    - change user role (except other admins)
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

- Profile - each user has 1 profile. Profile is not required for user to register

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

  Depending on status can be:
  - `PENDING`: is not being reviewed by anyone atm
  - `REVIEWING`: is currently reviewed by an admin or mod
  - `RESOLVED`: an action is taken against the user/entity
  - `DISMISSED`: report is dismissed

- Report History: entries about what a moderator or admin did regarding a report. Each entry contains the status change, reported comment, the reporter and a note regarding what happened.

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

1. Install the dependencies:

   ```sh
   npm install
   ```

1. Create environment variables:

   ```sh
   # Create .env files for each configuration in the root directory
   # See all .*.example files for what to setup exactly
   # Add necessary environment variables for database connection
   ```

1. Set up the database:

   ```sh
   # If you already have the DB you can skip this step
   npx nx create-db
   ```

1. Generate prisma types:

   ```sh
   # Generate prisma types
   nx generate-types prisma-schema

   # Generate e2e prisma types
   nx generate-types:e2e prisma-schema
   ```
