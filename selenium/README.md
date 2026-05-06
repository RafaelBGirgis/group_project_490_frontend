# Selenium Tests

Simple Selenium scripts for navigating and testing the Till Failure frontend.

## Setup

1. **Navigate to the selenium folder**:
   ```powershell
   cd selenium
   ```

2. **Create a virtual environment** (one time):
   ```powershell
   uv venv
   ```

3. **Activate the virtual environment**:
   ```powershell
   .venv\Scripts\activate.ps1
   ```

4. **Install dependencies** using `uv`:
   ```powershell
   uv pip install -r requirements.txt
   ```

3. **Ensure both services are running**:
   - Frontend: `http://localhost:5173` (run `npm run dev`)
   - Backend: `http://localhost:9090` (running in background)

## Running Tests

From the `selenium` folder, run any test script directly with Python:

```powershell
python test_landing_to_login.py
```

Output will show progress and indicate whether the test passed or failed.

## Available Tests

- `test_landing_to_login.py` - Navigate from landing page to login page

## Notes

- Microsoft Edge browser is used (requires Edge to be installed)
- WebDriver is automatically managed by `webdriver-manager`
- Tests are standalone scripts (no pytest required)
