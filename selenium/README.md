# Selenium UI Tests

Automated end-to-end tests for the frontend using **Python + pytest + Selenium** with **Microsoft Edge**.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.13+ | Managed by `uv` |
| uv | latest | See install instructions below |
| Microsoft Edge | any recent | Already installed on Windows |
| msedgedriver | matches Edge version | See install instructions below |

### Install uv

Open **Command Prompt** and run:
```cmd
pip install uv
```

### Install msedgedriver

`msedgedriver` must match your installed Edge version exactly.

1. Check your Edge version — open Edge and go to `edge://settings/help`. Note the version number (e.g. `124.0.2478.97`)
2. Download the matching driver from: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/
3. Unzip it and move `msedgedriver.exe` to `C:\Windows\System32\` — it will be on your PATH automatically
4. Verify it works — open a new Command Prompt and run:
   ```cmd
   msedgedriver --version
   ```
   If it prints a version number, you're done.

---

## Setup

Open **Command Prompt**, navigate to the `selenium/` folder, and run:

```cmd
cd path\to\group_project_490_frontend\selenium
uv venv
.venv\Scripts\activate
uv pip install selenium pytest pytest-html python-dotenv
```

Your prompt will show `(selenium)` when the virtual environment is active. You need to activate it every time you open a new Command Prompt window.

---

## Running the Tests

You need **three** Command Prompt windows open simultaneously.

**Window 1 — Frontend:**
```cmd
cd path\to\group_project_490_frontend
npm run dev
```

**Window 2 — Backend:**
```cmd
cd path\to\group_project_490_backend
uv run python -m src.api.app
```

**Window 3 — Tests:**
```cmd
cd path\to\group_project_490_frontend\selenium
.venv\Scripts\activate
uv run pytest
```

### Run a specific file
```cmd
uv run pytest tests\test_smoke.py
uv run pytest tests\test_login.py
```

### Run a specific test
```cmd
uv run pytest tests\test_login.py::TestLoginPage::test_login_page_loads
```

### Run headless (no browser window opens)
```cmd
set CI=true && uv run pytest
```

### View the HTML report
After a run, open `selenium\report.html` in your browser to see detailed results.

---

## Project Structure

```
selenium\
├── conftest.py           # WebDriver setup, shared fixtures (driver, auth_driver)
├── pyproject.toml        # pytest config + dependencies
├── .env                  # Test credentials and URLs
├── pages\
│   ├── __init__.py
│   ├── base_page.py      # BasePage: shared helpers (click, type, wait, find, etc.)
│   └── login_page.py     # LoginPage: locators + actions for /login
└── tests\
    ├── __init__.py
    ├── test_smoke.py     # Connectivity + routing sanity checks
    └── test_login.py     # Login happy path + error cases
```

---

## Understanding the Pattern: Page Object Model (POM)

This project uses the **Page Object Model** pattern, which keeps tests clean and maintainable.

Each page of the website gets its own Python class. That class holds two things:
- **Locators** — CSS selectors that identify elements on the page (inputs, buttons, etc.)
- **Actions** — methods that describe what a user can do on that page

Tests then call those actions in plain English rather than writing raw Selenium code everywhere.

```python
# Good: readable, easy to maintain
def test_valid_login_redirects(self, driver):
    page = LoginPage(driver, BASE_URL)
    page.open()
    page.login("user@example.com", "password123")
    assert "/login" not in page.current_url()

# Bad: brittle, hard to read
def test_valid_login_redirects(self, driver):
    driver.get("http://localhost:5173/login")
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys("user@example.com")
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("password123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    assert "/login" not in driver.current_url
```

---

## Adding New Tests

### 1. Create a page object
Create `pages\your_page.py`:

```python
from selenium.webdriver.common.by import By
from .base_page import BasePage

class YourPage(BasePage):
    URL = "/your-route"

    # Locators
    TITLE         = (By.CSS_SELECTOR, "h1")
    ACTION_BUTTON = (By.CSS_SELECTOR, "button.action")

    def open(self):
        super().open(self.URL)

    def click_action(self):
        self.click(self.ACTION_BUTTON)

    def get_title(self):
        return self.get_text(self.TITLE)
```

### 2. Export it from `pages\__init__.py`
```python
from .base_page import BasePage
from .login_page import LoginPage
from .your_page import YourPage
```

### 3. Create `tests\test_your_feature.py`
```python
import os
from pages import YourPage

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")

class TestYourFeature:
    def test_title_loads(self, driver):
        page = YourPage(driver, BASE_URL)
        page.open()
        assert page.get_title() == "Expected Title"

    def test_something_authenticated(self, auth_driver):
        page = YourPage(auth_driver, BASE_URL)
        page.open()
        assert page.is_visible(YourPage.ACTION_BUTTON)
```

### 4. Run your new tests
```cmd
uv run pytest tests\test_your_feature.py
```

---

## Key Fixtures (from conftest.py)

### `driver`
Fresh browser for each test, not logged in. Use for login tests, signup, and public pages.

### `auth_driver`
Browser pre-logged in as `TEST_EMAIL` / `TEST_PASSWORD`. Use for any test that requires authentication — it handles the login automatically before your test runs.

### `base_url`
Returns `BASE_URL` from `.env`. Useful if you need the URL directly in a test.

---

## BasePage Helpers Reference

| Method | What it does |
|--------|-------------|
| `open(path)` | Navigate to base_url + path |
| `current_url()` | Get the full current URL |
| `current_path()` | Get just the path (e.g. `/login`) |
| `find(locator)` | Wait for element to exist in DOM |
| `find_visible(locator)` | Wait for element to be visible |
| `find_clickable(locator)` | Wait for element to be clickable |
| `find_all(locator)` | Get all matching elements (no wait) |
| `click(locator)` | Click an element |
| `type(locator, text)` | Clear an input and type text |
| `get_text(locator)` | Get an element's text content |
| `is_visible(locator)` | Returns True/False, never crashes |
| `is_present(locator)` | Returns True/False, never crashes |
| `wait_for_url_to_contain(fragment)` | Wait until URL contains a string |
| `wait_for_url_to_change(old_url)` | Wait until URL changes |
| `wait_for_text_in_element(locator, text)` | Wait until text appears in element |

---

## Common Issues & Fixes

**`msedgedriver` not found**
```
Error: 'msedgedriver' executable needs to be in PATH
```
Make sure `msedgedriver.exe` is in `C:\Windows\System32\` and its version matches your Edge version.

**Tests time out waiting for an element**
```
selenium.common.exceptions.TimeoutException
```
Open your browser's dev tools (F12), inspect the element, and verify the CSS selector in the page object matches. Update the locator if needed.

**Login fails in `auth_driver`**
```
AssertionError or TimeoutException during login fixture
```
Check that `TEST_EMAIL` and `TEST_PASSWORD` in `.env` are correct and that the backend is running.

**`pytest` not recognized**
Use `uv run pytest` instead of bare `pytest`.

**Virtual environment not active**
If you open a new Command Prompt, re-run `.venv\Scripts\activate` before running tests.

---

## Tips for Writing Robust Tests

**Use waits, not `time.sleep()`** — waits adapt to actual page speed:
```python
# Good
page.wait_for_url_to_contain("dashboard")

# Bad
import time; time.sleep(2)
```

**Use `find_visible` over `find`** — an element can exist in the DOM but still be hidden:
```python
self.find_visible(locator)   # good
self.find(locator)           # less robust
```

**Test one thing per test** — narrow tests are easier to debug when they fail.

**Add messages to assertions** so failures tell you what went wrong:
```python
assert page.is_error_visible(), (
    f"Expected error to show, but URL is: {page.current_url()}"
)
```

---

## Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `API_URL` | `http://localhost:9090` | Backend URL |
| `TEST_EMAIL` | `rat8@njit.edu` | Test user email |
| `TEST_PASSWORD` | `password` | Test user password |
| `CI` | `false` | Set to `true` to run headless (no browser window) |

---

## Further Reading

- [Selenium Python Docs](https://selenium-python.readthedocs.io/)
- [pytest Documentation](https://docs.pytest.org/en/stable/)
- [Page Object Model Guide](https://www.browserstack.com/guide/page-object-model-in-selenium)
