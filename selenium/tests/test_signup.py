"""
tests/test_signup.py — Signup page UI tests.

Covers:
  - Page loads and displays form elements
  - Form validation (password mismatch, empty fields, invalid age)
  - Successful signup with unique email
  - Error messages display correctly
  - Navigation to login page
  - Google OAuth button visible
"""

import os
import pytest
from pages import SignupPage
from conftest import generate_unique_test_email
from selenium.webdriver.common.by import By

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
TEST_PASSWORD = "testpass123"


class TestSignupPage:

    # ------------------------------------------------------------------
    # Smoke: Page structure
    # ------------------------------------------------------------------

    def test_signup_page_loads(self, driver):
        """Signup page loads and displays form."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        assert page.current_url().endswith("/signup"), "Should be on signup page"
        assert page.form_heading_visible(), "Form heading should be visible"

    def test_all_form_fields_visible(self, driver):
        """All required form fields are visible."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        assert page.all_form_fields_visible(), "All form fields should be visible"
        assert page.google_button_visible(), "Google OAuth button should be visible"

    def test_login_link_visible(self, driver):
        """Login link is visible at bottom of form."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        assert page.login_link_visible(), "Login link should be visible"

    # ------------------------------------------------------------------
    # Validation: Empty fields
    # ------------------------------------------------------------------

    def test_empty_name_validation(self, driver):
        """Submitting with empty name should show error or not submit."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        # Leave name empty
        page.enter_email(generate_unique_test_email())
        page.enter_age("25")
        page.select_gender("Male")
        page.enter_password(TEST_PASSWORD)
        page.enter_confirm_password(TEST_PASSWORD)
        
        # Try to submit
        page.submit_form()
        
        import time
        time.sleep(1)
        
        # Should either show error or stay on signup page
        assert "/signup" in page.current_url() or page.error_message_visible(), (
            "Should either stay on signup page or show error when name is empty"
        )

    def test_empty_email_validation(self, driver):
        """Submitting with empty email should show error or not submit."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        page.enter_name("John Doe")
        page.enter_age("25")
        page.select_gender("Male")
        page.enter_password(TEST_PASSWORD)
        page.enter_confirm_password(TEST_PASSWORD)
        
        page.submit_form()
        import time
        time.sleep(1)
        
        assert "/signup" in page.current_url() or page.error_message_visible(), (
            "Should either stay on signup page or show error when email is empty"
        )

    # ------------------------------------------------------------------
    # Validation: Password mismatch
    # ------------------------------------------------------------------

    def test_password_mismatch_error(self, driver):
        """Passwords that don't match should show error."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email()
        page.enter_name("John Doe")
        page.enter_email(email)
        page.enter_age("25")
        page.select_gender("Male")
        page.enter_password("password123")
        page.enter_confirm_password("different456")
        
        page.submit_form()
        import time
        time.sleep(1)
        
        # Should show error and remain on signup page
        assert page.error_message_visible(), "Error message should be visible"
        assert "Passwords do not match" in page.get_error_message(), (
            "Error should mention passwords don't match"
        )
        assert "/signup" in page.current_url(), "Should remain on signup page"

    # ------------------------------------------------------------------
    # Validation: Age validation
    # ------------------------------------------------------------------

    def test_invalid_age_shows_error(self, driver):
        """Invalid age should show error."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email()
        page.enter_name("John Doe")
        page.enter_email(email)
        page.enter_age("abc")  # Invalid age
        page.select_gender("Male")
        page.enter_password(TEST_PASSWORD)
        page.enter_confirm_password(TEST_PASSWORD)
        
        page.submit_form()
        import time
        time.sleep(1)
        
        # Should show error about age
        assert page.error_message_visible() or "/signup" in page.current_url(), (
            "Should show error or stay on page with invalid age"
        )

    def test_negative_age_shows_error(self, driver):
        """Negative age should show error."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email()
        page.enter_name("John Doe")
        page.enter_email(email)
        page.enter_age("-5")
        page.select_gender("Male")
        page.enter_password(TEST_PASSWORD)
        page.enter_confirm_password(TEST_PASSWORD)
        
        page.submit_form()
        import time
        time.sleep(1)
        
        assert page.error_message_visible() or "/signup" in page.current_url(), (
            "Should show error or stay on page with negative age"
        )

    # ------------------------------------------------------------------
    # Happy path: Successful signup
    # ------------------------------------------------------------------

    def test_valid_signup_redirects_to_onboarding(self, driver):
        """Valid signup credentials should redirect to onboarding."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email("testuser")
        page.signup(
            name="John Doe",
            email=email,
            age="25",
            gender="Male",
            password=TEST_PASSWORD
        )

        # Wait for redirect (signup → onboarding)
        page.wait_for_url_to_contain("onboarding", timeout=10)
        
        assert "/onboarding" in page.current_url(), (
            f"Expected redirect to /onboarding, got: {page.current_url()}"
        )

    def test_signup_with_optional_fields(self, driver):
        """Signup with optional bio and profile picture URL."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email("testuser")
        page.signup(
            name="Jane Smith",
            email=email,
            age="28",
            gender="Female",
            password=TEST_PASSWORD,
            pfp_url="https://example.com/avatar.jpg",
            bio="Love fitness and health"
        )

        page.wait_for_url_to_contain("onboarding", timeout=10)
        assert "/onboarding" in page.current_url(), "Should redirect to onboarding"

    def test_signup_different_gender_options(self, driver):
        """Test signup with different gender options."""
        genders = ["Male", "Female", "Non-binary", "Prefer not to say"]
        
        for gender in genders:
            page = SignupPage(driver, BASE_URL)
            page.open()
            
            email = generate_unique_test_email(f"user_{gender}")
            page.signup(
                name=f"User {gender}",
                email=email,
                age="30",
                gender=gender,
                password=TEST_PASSWORD
            )
            
            page.wait_for_url_to_contain("onboarding", timeout=10)
            assert "/onboarding" in page.current_url(), f"Should redirect for gender: {gender}"

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------

    def test_login_link_navigates_to_login(self, driver):
        """Clicking login link navigates to login page."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        page.click(page.LOGIN_LINK)
        page.wait_for_url_to_contain("login", timeout=5)

        assert "/login" in page.current_url(), "Should navigate to login page"

    # ------------------------------------------------------------------
    # Email field interaction
    # ------------------------------------------------------------------

    def test_email_field_accepts_various_formats(self, driver):
        """Email field accepts valid email formats."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        email = generate_unique_test_email("test.user+tag")
        page.enter_email(email)
        
        # Verify the email was entered
        email_input = page.find_visible(page.EMAIL_INPUT).get_attribute("value") or ""
        assert email in email_input, "Email should be entered correctly"

    # ------------------------------------------------------------------
    # Form reset / fresh load
    # ------------------------------------------------------------------

    def test_form_fields_empty_on_fresh_load(self, driver):
        """Form fields are empty when page first loads."""
        page = SignupPage(driver, BASE_URL)
        page.open()

        # Check form fields are empty (except read-only ones)
        name_input = page.find_visible(page.NAME_INPUT)
        email_input = page.find_visible(page.EMAIL_INPUT)
        
        assert name_input.get_attribute("value") == "", "Name field should be empty"
        assert email_input.get_attribute("value") == "", "Email field should be empty"
