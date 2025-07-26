# WCHL-hackathon
The project is called Dev Gallery made with Rust and React.

Dev Gallery is a platform where users share their programming projects with other people by providing a link to it, description, and basic information about it. They can also
provide contact information and find people to hire for the in-development projetcs.
The project might help smaller developers get more attention on their creations.

- The platform uses the Internet Identity logging system.
- Logged users can upvote or downvote any post
- Each user (identity) can only vote once
- Users that aren't logged in can only view and search through the posts

Possible updates:
- Making logged in users able to join to the projects
- Built-in chat
- Ability to post devlogs
- Ability to sort projects by their score (votes)
- Ability to promote your projects
- Potentially adding ads

How to setup for local dev:
- You will need to have node.js, dfx
- Clone repo
- Get to the project
- Run commands:
    dfx start --clean --background1
    dfx deploy wchl-hackathon-backend
    dfx deploy wchl-hackathon-frontend
    echo "Frontend URL: http://localhost:4943/?canisterId=$(dfx canister id wchl-hackathon-frontend)"
- Click on a link to view app
  
Made by: Justyn Odyjas, Igor Maciejewski
