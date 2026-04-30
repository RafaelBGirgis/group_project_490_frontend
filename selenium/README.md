# Selenium UI Tests

Automated end-to-end tests for the frontend using **Python + pytest + Selenium** with **Microsoft Edge**.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.13+ | Managed by `uv` |
| uv | latest | `pip install uv` or `curl -Lsf https://astral.sh/uv/install.sh \| sh` |
| Microsoft Edge | any recent | Must be installed |
| msedgedriver | matches Edge version | See below |

### Install msedgedriver

`msedgedriver` must match your installed Edge version exactly.

1. Check your Edge version: `edge://settings/help`
2. Download the matching driver from: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/
3. Place `msedgedriver` (or `msedgedriver.exe` on Windows) somewhere on your `PATH`,  
   e.g. `C:\Program Files\msedgedriver\` (Windows) or `/usr/local/bin/msedgedriver` (Mac/Linux)

---

## Quick Start

```bash
# 1. From the repo root, enter the selenium folder
cd selenium

# 2. Create virtual environment and install dependencies
uv venv
.venv\Scripts\activate

# 3. Update .env with your test credentials

# 4. Start the frontend and backend (in separate terminals)
# Terminal A (frontend)
cd ..
npm run dev

# Terminal B (backend)
cd ../../group_project_490_backend
uv run python -m src.api.app

# 5. Run the tests (from selenium/ directory)
pytest
```

---

## Running Tests

Both servers must be running before you run tests. From the `selenium/` directory:

### Run all tests
```bash
pytest
```

### Run a specific file
```bash
pytest tests/test_smoke.py
pytest tests/test_login.py
```

### Run a specific test
```bash
pytest tests/test_login.py::TestLoginPage::test_login_page_loads
```

### Run headless (CI mode, no browser window)
```bash
CI=true pytest
```

### View the HTML report
After a run, open `selenium/report.html` in your browser to see detailed results with screenshots (if enabled).

---

## Project Structure

```
selenium/
├── conftest.py           # WebDriver setup, shared fixtures (driver, auth_driver)
├── pyproject.toml        # uv/pytest config + dependencies
├── .env                  # Test credentials and URLs (git-ignored)
├── .env.example          # Template for .env
├── pages/
│   ├── __init__.py
│   ├── base_page.py      # BasePage: shared helpers (click, type, wait, find, etc.)
│   └── login_page.py     # LoginPage: locators + actions for /login
└── tests/
    ├── __init__.py
    ├── test_smoke.py     # Connectivity + routing sanity checks
    └── test_login.py     # Login happy path + error cases
```

---

## Understanding the Pattern: Page Object Model (POM)

This project uses the **Page Object Model** pattern, which keeps tests clean and maintainable:

### BasePage
- Centralized Selenium helpers: `click()`, `type()`, `find_visible()`, `wait_for_url_to_change()`, etc.
- Every page extends `BasePage`
- Reduces code duplication

### Page Objects (e.g., LoginPage)
- Define **locators** (CSS selectors, XPath, etc.) as class attributes
- Provide **high-level actions** like `login(email, password)` instead of raw Selenium calls
- Keep test code focused on **what** the user does, not **how** the browser does it

### Test Files
- Import page objects and use them to write clear, readable tests
- Focus on behavior, not implementation details

**Example:**
```python
# Good: High-level, readable
def test_valid_login_redirects(self, driver):
    page = LoginPage(driver, BASE_URL)
    page.open()
    page.login("user@example.com", "password123")
    assert "/login" not in page.current_url()

# Bad: Low-level, brittle
def test_valid_login_redirects(self, driver):
    driver.get("http://localhost:5173/login")
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys("user@example.com")
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("password123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    assert "/login" not in driver.current_url
```

---

## Adding New Tests

### 1. Create a new page object (if needed)
Create `pages/new_feature_page.py`:

```python
from selenium.webdriver.common.by import By
from .base_page import BasePage


class FeaturePage(BasePage):
    URL = "/feature"
    
    # Locators
    TITLE = (By.CSS_SELECTOR, "h1")
    ACTION_BUTTON = (By.CSS_SELECTOR, "button.action")
    
    def open(self):
        super().open(self.URL)
    
    def click_action(self):
        self.click(self.ACTION_BUTTON)
    
    def get_title(self):
        return self.get_text(self.TITLE)
```

### 2. Update `pages/__init__.py` to export it
```python
from .base_page import BasePage
from .login_page import LoginPage
from .new_feature_page import FeaturePage

__all__ = ["BasePage", "LoginPage", "FeaturePage"]
```

### 3. Create tests in `tests/test_new_feature.py`
```python
import os
from pages import FeaturePage

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")

class TestFeature:
    def test_feature_title_loads(self, driver):
        page = FeaturePage(driver, BASE_URL)
        page.open()
        assert page.get_title() == "Feature Title"
```

### 4. Run your new tests
```bash
pytest tests/test_new_feature.py
```

---

## Key Fixtures (from conftest.py)

### `driver` fixture
- Fresh WebDriver for each test
- Not logged in
- Use for: login tests, signup, public pages

```python
def test_public_page(self, driver):
    driver.get("http://localhost:5173")
```

### `auth_driver` fixture
- WebDriver pre-logged in with TEST_EMAIL / TEST_PASSWORD
- Waits for redirect away from /login to confirm login success
- Use for: any test that requires authentication

```python
def test_dashboard_loads(self, auth_driver):
    page = DashboardPage(auth_driver, BASE_URL)
    page.open()
    # Already logged in!
```

### `base_url` fixture
- Provides the BASE_URL from .env

---

## BasePage Helpers Reference

### Navigation
- `open(path)` — Navigate to base_url + path
- `current_url()` — Get full URL
- `current_path()` — Get just the path portion ("/login", "/dashboard", etc.)

### Finding elements (with waits)
- `find(locator)` — Wait for element to be present
- `find_visible(locator)` — Wait for element to be visible
- `find_clickable(locator)` — Wait for element to be clickable
- `find_all(locator)` — Get all matching elements (no wait)

### Actions
- `click(locator)` — Click element
- `type(locator, text, clear=True)` — Type text into input
- `get_text(locator)` — Get element's text content

### Assertions
- `is_visible(locator, timeout=3)` — Check if element is visible (no exception)
- `is_present(locator, timeout=3)` — Check if element exists in DOM (no exception)

### Advanced waits
- `wait_for_url_to_contain(fragment)` — Wait for URL to contain a fragment
- `wait_for_url_to_change(old_url)` — Wait for URL to change from old_url
- `wait_for_text_in_element(locator, text)` — Wait for specific text to appear

---

## Common Issues & Fixes

### `msedgedriver` not found
```
Error: 'msedgedriver' executable needs to be in PATH
```
**Fix:** Ensure msedgedriver is on your PATH and matches your Edge version.

### Tests timeout waiting for element
```
selenium.common.exceptions.TimeoutException: Message: timeout
```
**Fix:** 
- Check selectors in page object (use browser dev tools to verify)
- Increase timeout: `self.find_visible(locator, timeout=20)`
- Add `time.sleep(1)` before critical actions if JS is loading content

### Login fails in `auth_driver` fixture
```
Failed to login in auth_driver
```
**Fix:**
- Verify TEST_EMAIL and TEST_PASSWORD in .env are correct
- Ensure the backend is running
- Check the CSS selectors in conftest.py's login logic match your form

### Tests pass locally but fail in CI
```
(various errors in GitHub Actions)
```
**Fix:**
- Ensure `.github/workflows/run_tests.yml` sets `CI=true`
- Check that both frontend and backend servers are started before tests run
- Use headless mode: `CI=true pytest`

---

## Tips for Writing Robust Tests

1. **Use relative waits, not `time.sleep()`** — Waits adapt to speed
   ```python
   # Good
   page.wait_for_url_to_contain("dashboard")
   
   # Bad
   import time; time.sleep(2)
   ```

2. **Wait for visibility, not just presence** — Element might exist but be hidden
   ```python
   # Good
   self.find_visible(locator)
   
   # Less robust
   self.find(locator)
   ```

3. **Test one thing per test** — Narrow, focused assertions
   ```python
   # Good
   def test_email_field_required(self, driver):
       # Just test that empty email shows error or stays on page
   
   # Too broad
   def test_login_form(self, driver):
       # Tests 10 things: fields exist, validation, redirect, error, etc.
   ```

4. **Use meaningful assertion messages**
   ```python
   assert page.is_error_visible(), (
       f"Expected error message to show on /login, but URL is: {page.current_url()}"
   )
   ```

---

## Further Reading

- [Selenium Python Docs](https://selenium-python.readthedocs.io/)
- [Page Object Model Best Practices](https://www.browserstack.com/guide/page-object-model-in-selenium)
- [Pytest Fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [pytest-html for Reports](https://pytest-html.readthedocs.io/)


1. **Create a page object** in `pages/your_page.py` extending `BasePage`
2. **Create a test file** in `tests/test_your_feature.py`
3. Use `driver` fixture for unauthenticated tests, `auth_driver` for authenticated ones

```python
# Example
from pages.your_page import YourPage

class TestYourFeature:
    def test_something(self, auth_driver, base_url):
        page = YourPage(auth_driver, base_url)
        page.open()
        assert page.is_visible(YourPage.SOME_ELEMENT)
```

---

## Environment variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `API_URL` | `http://localhost:9090` | Backend URL |
| `TEST_EMAIL` | `rat8@njit.edu` | Test user email |
| `TEST_PASSWORD` | `password` | Test user password |
| `CI` | `false` | Set to `true` to run headless |
