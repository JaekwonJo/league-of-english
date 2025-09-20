# League of English - CSAT English Practice Suite

League of English is a web application that helps students and teachers generate, solve, and analyse CSAT-style English problems. The project consists of a Node/Express API and a React front-end.

## Main Features
- Upload English passages (PDF/TXT) and generate CSAT problem sets (order, insertion, grammar, vocab, etc.).
- Solve problems with timers, automatic scoring, and result dashboards.
- Analyse passages sentence-by-sentence with AI-generated explanations.
- Admin tools for document management, ranking, and vocab exercises.

## Tech Stack
- **Frontend**: React 19, CRA, lucide-react
- **Backend**: Node 20, Express, sql.js
- **Tooling**: Windows PowerShell, npm scripts (`dev`, `client`, `build`, `lint`)

## Prerequisites
- Windows 10/11 with the built-in Windows PowerShell (preferably run as Administrator when managing ports).
- Node.js 20 LTS installed on Windows (via the official installer or nvm-windows).
- npm 10+ (bundled with the Node.js installer).

## Quick Start (PowerShell)
1. **Open Windows PowerShell.**
   ```powershell
   cd C:\Users\jaekw\Desktop\league-of-english
   ```
2. **Install dependencies (first time only).**
   ```powershell
   npm install
   cd client
   npm install
   cd ..
   ```
3. **Run the full stack.**
   ```powershell
   npm run dev:all
   ```
   - This launches the API on port 5000 and the React app on port 3000.
   - Visit `http://localhost:3000` in your browser.
   - API health check: `http://localhost:5000/health`.
4. **Stop the servers.** Press `Ctrl + C` in the PowerShell window.

## Common Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Run Express API only (port 5000). |
| `npm run client` | Run React dev server only (port 3000). |
| `npm run dev:all` | Run both API and client concurrently from the repository root. |
| `npm run build` | Build the React client. |
| `npm run lint` | Lint server-side JS files. |
| `node scripts/update-problem-manuals.js` | Refresh the authoring manuals from the latest source PDFs. |

## Troubleshooting
- **Port already in use**: Close other apps using ports 3000 or 5000. You can run `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess` in PowerShell (with admin rights) to identify and stop them.
- **React keeps pointing to the wrong API**: Delete `client/.env`, then restart using `npm run dev:all` so the client falls back to `http://localhost:5000/api`.
- **Grammar problem shows no underlines**: make sure you are on the latest branch; the front-end now parses `<u>...</u>` spans.
- **PowerShell execution policy blocks scripts**: temporarily allow scripts by running `Set-ExecutionPolicy -Scope Process RemoteSigned` before starting the dev servers.

## Repository Structure (high-level)
```
client/   # React front-end
server/   # Express API & AI problem generation services
docs/     # ADRs, decision logs, session notes
scripts/  # Local development helpers
```

## Contributing
1. Fork and clone the repository.
2. Run `npm install` in the root and in `client/`.
3. Create a feature branch, make changes, and run lint/tests when applicable.
4. Submit a pull request describing the changes and testing steps.

## License
This project is proprietary. Do not distribute without permission.
