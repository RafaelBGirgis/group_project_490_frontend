"""
conftest.py — shared fixtures for all Selenium tests.

Setup:
  - Spins up a Microsoft Edge WebDriver (headless in CI, headed locally)
  - Provides a pre-logged-in `auth_driver` fixture for tests that need auth
  - Reads config from .env so credentials never live in test code
"""

import sys
from pathlib import Path

# Add selenium folder to sys.path so imports like 'from pages import LoginPage' work
# This helps both pytest and Pylance understand the imports
sys.path.insert(0, str(Path(__file__).parent))

import os
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

    # If msedgedriver is on PATH, Service() with no args works fine.
    # To pin a specific binary: EdgeService(executable_path="/path/to/msedgedriver")
    driver = webdriver.Edge(options=options)
    driver.implicitly_wait(5)  # seconds — fallback for all find_element calls
    return driver


# ---------------------------------------------------------------------------
# Core driver fixture  (one browser per test, torn down after)
# ---------------------------------------------------------------------------

@pytest.fixture()
def driver():
    """
    Plain WebDriver — not logged in.
    Use this for login page tests, signup tests, and public routes.
    """
    headless = os.getenv("CI", "false").lower() == "true"
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

    Strategy: navigate to /login, fill credentials, submit, wait for redirect.
    Adjust the selectors below to match your actual login form.
    """
    driver.get(f"{BASE_URL}/login")

    wait = WebDriverWait(driver, 10)

    # --- Fill in email ---
    email_field = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name='email']"))
    )
    email_field.clear()
    email_field.send_keys(TEST_EMAIL)

    # --- Fill in password ---
    password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    password_field.clear()
    password_field.send_keys(TEST_PASSWORD)

    # --- Submit ---
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    submit_btn.click()

    # --- Wait until we've left /login (redirect means login succeeded) ---
    wait.until(EC.url_changes(f"{BASE_URL}/login"))

    yield driver  # test runs here


# ---------------------------------------------------------------------------
# Convenience re-exports for tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def base_url():
    return BASE_URL
