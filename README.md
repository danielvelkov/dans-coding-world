# DansCodingWorld

A task project for The Odin Project (TOP).
A basic blog full stack app with an express backend and two React front ends:

- one for the user(s) creating the posts
- one for the consumers

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
