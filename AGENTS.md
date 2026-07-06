# Kanban Project

## Business Requirements

- An MVP of a Kanban style Project Management application as a web app  
- The web app should only have 1 board
- The board has fixed 5 columns that can be renamed  
- Each card has a title and details only
- Drag and drop interface to move cards between columns
- Add a new card to a column; delete an existing card
- No more functionality: no archive, no search/filter. Keep it simple.
- The priority is a slick, professional, gorgeous UI/UX with very simple features
- The app should open with dummy data populated for the single board
There is a AI chat featre in the side bar;the AI should be able to create/edit/move one or more cards
## Technical Details

- Implemented as a modern NextJS app, client rendered
- The NextJS app should be created in a subdirectory `frontend`
- No user management for the MVP
- Use popular libraries
- User "uv" as the package manager for the python.in in the Docker container
Use SQLLite local database for the database, creating a new db if it doesn't exist.

## Current State
The MVP is complete: frontend, backend, database, and AI assistant are all built, wired together, tested, and run via Docker. See `docs/plan.md` for the phase-by-phase build log and `README.md` for setup instructions.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all critiera are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects
4. Only complete when the MVP is finished and tested, with the server running and ready for the user

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever

## Limitations
For the MVP , there will only be a user sign in (harcoded to 'user and 'password') but the data base will supoort multiple users for future.
For the MVP, there will only 1 kaban board per signed in user.
For the MVP , this will run locally (in a docker container)