"""
tests/test_login.py — Login flow tests.

Covers:
  - Page loads and shows expected form elements
  - Valid credentials → redirect away from /login
  - Invalid credentials → error message shown
  - Empty submission → form does not navigate away
"""

import os
import pytest
from pages import LoginPage

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
TEST_EMAIL = os.getenv("TEST_EMAIL", "rat8@njit.edu")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "password")


class TestLoginPage:

    # ------------------------------------------------------------------
    # Smoke: page structure
    # ------------------------------------------------------------------

    def test_login_page_loads(self, driver):
        """The /login route renders the login form."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        assert page.is_visible(LoginPage.EMAIL_INPUT), "Email input not visible"
        assert page.is_visible(LoginPage.PASSWORD_INPUT), "Password input not visible"
        assert page.is_visible(LoginPage.SUBMIT_BUTTON), "Submit button not visible"

    def test_login_page_title_or_heading(self, driver):
        """Page has a meaningful title or heading (basic sanity check)."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        title = driver.title
        assert title, "Browser tab title should not be empty"

    # ------------------------------------------------------------------
    # Happy path
    # ------------------------------------------------------------------

    def test_valid_login_redirects(self, driver):
        """Valid credentials redirect the user away from /login."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        before = page.current_url()
        page.login(TEST_EMAIL, TEST_PASSWORD)
        page.wait_for_url_to_change(before, timeout=10)

        assert "/login" not in page.current_url(), (
            f"Expected redirect away from /login, but still at: {page.current_url()}"
        )

    # ------------------------------------------------------------------
    # Sad paths
    # ------------------------------------------------------------------

    def test_invalid_password_shows_error(self, driver):
        """Wrong password keeps user on /login and shows an error."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        page.login(TEST_EMAIL, "wrongpassword123!")

        # Should still be on /login
        assert "/login" in page.current_url() or page.is_error_visible(), (
            "Expected error message or to remain on /login with wrong password"
        )

    def test_invalid_email_shows_error(self, driver):
        """Non-existent email keeps user on /login and shows an error."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        page.login("nonexistent_user@example.com", TEST_PASSWORD)

        assert "/login" in page.current_url() or page.is_error_visible(), (
            "Expected error message or to remain on /login with unknown email"
        )

    def test_empty_email_does_not_navigate(self, driver):
        """Submitting with empty email should not leave /login."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        page.enter_password(TEST_PASSWORD)
        page.submit()

        assert "/login" in page.current_url(), (
            "Should stay on /login when email is empty"
        )

    def test_empty_password_does_not_navigate(self, driver):
        """Submitting with empty password should not leave /login."""
        page = LoginPage(driver, BASE_URL)
        page.open()

        page.enter_email(TEST_EMAIL)
        page.submit()

        assert "/login" in page.current_url(), (
            "Should stay on /login when password is empty"
        )
