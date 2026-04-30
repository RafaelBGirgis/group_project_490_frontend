"""
conftest.py — shared fixtures for all Selenium tests.

Setup:
  - Spins up a Microsoft Edge WebDriver (headless in CI, headed locally)
  - Provides a pre-logged-in `auth_driver` fixture for tests that need auth
  - Reads config from .env so credentials never live in test code
"""

import os
import time
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
TEST_EMAIL = os.getenv("TEST_EMAIL", "rat8@njit.edu")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "password")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_edge_driver(headless: bool = False) -> webdriver.Edge:
    """Create and return a configured Edge WebDriver instance."""
    options = EdgeOptions()

    if headless:
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--log-level=3")
    options.add_experimental_option("excludeSwitches", ["enable-logging"])

    driver = webdriver.Edge(options=options)
    driver.implicitly_wait(5)
    return driver


def generate_unique_test_email(prefix: str = "testuser") -> str:
    """
    Generate a unique email for test signup.
    Uses timestamp to ensure uniqueness across test runs.
    Example: testuser_1234567890@test.local
    """
    timestamp = int(time.time() * 1000)  # milliseconds for extra uniqueness
    return f"{prefix}_{timestamp}@test.local"


# ---------------------------------------------------------------------------
# Core driver fixture  (one browser per test, torn down after)
# ---------------------------------------------------------------------------

@pytest.fixture()
def driver():
    """
    Plain WebDriver — not logged in.
    Use this for login page tests, signup tests, and public routes.
    """
    headless = os.getenv("CI", "false").strip().lower() == "true"
    d = make_edge_driver(headless=headless)
    yield d
    d.quit()


# ---------------------------------------------------------------------------
# Authenticated driver fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def auth_driver(driver):
    """
    WebDriver pre-authenticated as TEST_EMAIL / TEST_PASSWORD.
    Use this for any test that requires a logged-in session.

    Notes on this app's login form (from login.jsx):
      - Email:     input[type='email']
      - Password:  input[type='password']
      - Submit:    button[type='submit']
      - After login, the app checks localStorage for
        'onboarding_complete:{email}'. We pre-set it to 'true' so
        the redirect always goes to /client instead of /onboarding.
    """
    driver.get(f"{BASE_URL}/login")

    wait = WebDriverWait(driver, 15)

    # --- Pre-set onboarding flag so login always redirects to /client ---
    normalized_email = TEST_EMAIL.strip().lower()
    driver.execute_script(
        "window.localStorage.setItem(arguments[0], 'true');",
        f"onboarding_complete:{normalized_email}"
    )

    # --- Fill in email ---
    email_field = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    email_field.clear()
    email_field.send_keys(TEST_EMAIL)

    # --- Fill in password ---
    password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    password_field.clear()
    password_field.send_keys(TEST_PASSWORD)

    # --- Submit ---
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    submit_btn.click()

    # --- Wait until we've landed on /client ---
    wait.until(EC.url_contains("/client"))

    yield driver  # test runs here


# ---------------------------------------------------------------------------
# Convenience re-exports for tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def base_url():
    return BASE_URL