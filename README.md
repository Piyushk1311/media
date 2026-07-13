# DH Editorial Intelligence Dashboard - GitHub Pages Version

This folder is the static version for GitHub Pages.

## Upload to GitHub

1. Create a new GitHub repository.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. In GitHub, go to `Settings` -> `Pages`.
4. Set source to `Deploy from a branch`.
5. Select the `main` branch and `/root`.
6. Save. GitHub will give you a URL like:

```text
https://your-username.github.io/your-repository/
```

## Notes

- This version runs fully in the browser because GitHub Pages cannot run a Node/FastAPI backend.
- It fetches RSS feeds directly first, then falls back to free public CORS proxies.
- If live feeds are blocked by a browser, network, or proxy limit, the dashboard opens with starter data and cached data from the last successful refresh.
- OpenAI API calls are not included in this static version because exposing an API key in browser code would be unsafe.
