# Campus Index

A small, single-page app for keeping a shared list of colleges and their IGCSE requirements. It uses Python, Flask, and SQLite.

## Run locally

Requires Python 3.10 or newer.

```sh
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open <http://localhost:3000>. The database is created automatically at `data/colleges.sqlite`. Set `DATABASE_PATH` to use another location; the server uses `PORT` when provided by a host.

## Deploy to Railway from GitHub

1. Connect this GitHub repository to a new Railway project.
2. Railway installs dependencies from `requirements.txt` and starts the Flask app with Gunicorn.
3. Add a Railway **Volume** to the app service and mount it at `/data`.
4. Set the service variable `DATABASE_PATH=/data/colleges.sqlite` and generate a public domain.

The volume matters: the app writes to SQLite, and files outside a Railway volume are not durable between deployments. Keep the volume attached to this service.

## GitHub collaboration and automatic deployment

Invite collaborators to the GitHub repository. Use branches and pull requests so changes can be reviewed before merging. In Railway, enable GitHub deployment for the production branch; Railway will build and deploy when changes are merged. Use a separate Railway service/project for previews or development if the team needs an isolated environment.

## API

- `GET /api/colleges` — list rows
- `POST /api/colleges` — add `{ "country", "college", "igcseNeeded" }`
- `PUT /api/colleges/:id` — update those fields
- `DELETE /api/colleges/:id` — remove a row

This starter app has no login or user permissions. Add authentication and authorization before storing data that should not be editable by anyone who can access the public app.
