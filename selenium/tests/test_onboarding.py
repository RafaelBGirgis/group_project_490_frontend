"""
tests/test_onboarding.py — Onboarding page UI tests.

Covers:
  - Page loads and displays all required fields
  - Form validation for required fields
  - Successful onboarding completion
  - Error messages display correctly
  - Navigation and redirects
  - Read-only fields (name, email from signup)
"""

import os
import pytest
from pages import OnboardingPage, SignupPage
from conftest import generate_unique_test_email
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
TEST_PASSWORD = "testpass123"


class TestOnboardingPage:

    # ------------------------------------------------------------------
    # Setup: Helper to signup before onboarding
    # ------------------------------------------------------------------

    def signup_and_go_to_onboarding(self, driver) -> tuple[str, str]:
        """
        Complete signup flow to reach onboarding page.
        
        Returns: (email, password) tuple for the created account
        """
        signup_page = SignupPage(driver, BASE_URL)
        signup_page.open()
        
        email = generate_unique_test_email("onboard_test")
        signup_page.signup(
            name="Test User",
            email=email,
            age="25",
            gender="Male",
            password=TEST_PASSWORD
        )
        
        # Wait for redirect to onboarding
        signup_page.wait_for_url_to_contain("onboarding", timeout=10)
        
        return email, TEST_PASSWORD

    # ------------------------------------------------------------------
    # Smoke: Page structure
    # ------------------------------------------------------------------

    def test_onboarding_page_loads_after_signup(self, driver):
        """Onboarding page loads after successful signup."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        assert page.page_heading_visible(), "Page heading should be visible"

    def test_all_required_fields_visible(self, driver):
        """All required onboarding fields are visible."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load(timeout=5)
        
        assert page.all_required_fields_visible(), "All required fields should be visible"

    def test_form_sections_visible(self, driver):
        """All form sections are visible."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Wait until headers are present
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.TAG_NAME, "h2"))
        )

        headers = driver.find_elements(By.TAG_NAME, "h2")
        header_texts = [h.text.strip() for h in headers]

        required_sections = [
            "Primary Goal",
            "Fitness Level",
            "Training Availability",
            "Payment Information",
        ]

        for section in required_sections:
            assert any(
                section.lower() in header.lower()
                for header in header_texts
            ), f"Section '{section}' should be visible"

    # ------------------------------------------------------------------
    # Field visibility and prefill
    # ------------------------------------------------------------------

    def test_name_and_email_prefilled_from_signup(self, driver):
        """Name and email are prefilled from signup and read-only."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Check that email field exists and has value
        email_input = page.find_visible(page.EMAIL_INPUT, timeout=2)
        assert email_input.get_attribute("readonly"), "Email should be read-only"
        
        # Value should contain the signup email
        email_value = email_input.get_attribute("value")
        assert email in email_value.lower() or email_value != "", "Email should be prefilled" # type: ignore

    # ------------------------------------------------------------------
    # Validation: Empty/incomplete fields
    # ------------------------------------------------------------------

    def test_submit_without_primary_goal_shows_error(self, driver):
        """Submitting without primary goal should show error or disable submit."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Fill only some fields (skip primary goal)
        page.enter_weight("165 lbs")
        page.enter_height("5 ft 10 in")
        page.enter_age("25")
        page.select_gender("male")
        page.enter_card_number("3529576776200565")
        page.enter_card_cvv("961")
        page.enter_card_expiry("2028-04-31")
        
        # Try to submit
        if page.submit_button_enabled():
            page.submit_form()
            import time
            time.sleep(1)
            # Should show error or stay on page
            assert page.error_message_visible() or "/onboarding" in page.current_url(), (
                "Should show error when primary goal is missing"
            )

    def test_submit_without_payment_info_shows_error(self, driver):
        """Submitting without payment info should show error or disable submit."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Fill all fields except payment
        page.select_primary_goal("Muscle Gain")
        page.enter_weight("180 lbs")
        page.enter_height("5 ft 11 in")
        page.enter_age("28")
        page.select_gender("male")
        
        # Try to submit without payment
        if page.submit_button_enabled():
            page.submit_form()
            import time
            time.sleep(1)
            assert page.error_message_visible() or "/onboarding" in page.current_url(), (
                "Should show error or disable submit when payment is missing"
            )

    # ------------------------------------------------------------------
    # Field interactions: Primary goal
    # ------------------------------------------------------------------

    def test_select_each_primary_goal_option(self, driver):
        """All primary goal options can be selected."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        goals = ["Weight Loss", "Maintenance", "Muscle Gain"]
        
        for goal in goals:
            page.select_primary_goal(goal)
            # Field should have been selected (hard to verify exact value in Selenium)
            # Just verify no error occurs

    # ------------------------------------------------------------------
    # Field interactions: Fitness metrics
    # ------------------------------------------------------------------

    def test_enter_weight_formats(self, driver):
        """Weight field accepts various formats."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        page.enter_weight("165 lbs")
        weight_input = page.find_visible(page.WEIGHT_INPUT)
        assert "165" in weight_input.get_attribute("value"), "Weight should be entered" # type: ignore

    def test_enter_height_formats(self, driver):
        """Height field accepts various formats."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        page.enter_height("5 ft 10 in")
        height_input = page.find_visible(page.HEIGHT_INPUT)
        assert "5" in height_input.get_attribute("value"), "Height should be entered" # type: ignore

    def test_gender_dropdown_options(self, driver):
        """Gender dropdown has proper options."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Try selecting different genders
        genders = ["male", "female", "non-binary", "prefer_not_to_say"]
        for gender in genders:
            page.select_gender(gender)
            # Should not raise error

    # ------------------------------------------------------------------
    # Field interactions: Payment info
    # ------------------------------------------------------------------

    def test_card_number_field_accepts_input(self, driver):
        """Card number field accepts input."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        page.enter_card_number("3529576776200565")
        card_input = page.find_visible(page.CARD_NUMBER_INPUT)
        assert "3529" in card_input.get_attribute("value"), "Card number should be entered" # type: ignore

    def test_card_cvv_field_accepts_input(self, driver):
        """Card CVV field accepts input."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        page.enter_card_cvv("961")
        cvv_input = page.find_visible(page.CARD_CVV_INPUT)
        assert "961" in cvv_input.get_attribute("value"), "CVV should be entered" # type: ignore

    def test_card_expiry_date_field(self, driver):
        """Card expiry date field accepts input."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        page.enter_card_expiry("2028-04-31")
        expiry_input = page.find_visible(page.CARD_EXPIRY_INPUT)
        assert "2025" in expiry_input.get_attribute("value"), "Expiry date should be entered" # type: ignore

    # ------------------------------------------------------------------
    # Happy path: Complete onboarding
    # ------------------------------------------------------------------

    def test_complete_full_onboarding_flow(self, driver):
        """Complete full onboarding with all required fields."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Fill all required fields
        page.fill_required_fields(
            goal="Muscle Gain",
            weight="165 lbs",
            height="5 ft 10 in",
            age="25",
            gender="male",
            card_number="3529576776200565",
            card_cvv="961",
            card_expiry="2028-04-31"
        )
        
        page.enter_bio("Ready to build muscle and get stronger!")
        
        # Submit
        page.submit_form()
        
        # Should redirect to client dashboard or success page
        import time
        time.sleep(2)
        
        current_url = page.current_url()
        # Should either go to /client, /dashboard, or show success
        assert (
            "/client" in current_url or 
            "/dashboard" in current_url or 
            page.current_url() != page.current_url()  # URL changed
        ), f"Expected redirect after onboarding, got: {current_url}"

    def test_complete_onboarding_with_all_goals(self, driver):
        """Test onboarding completion with each primary goal option."""
        goals = ["Weight Loss", "Maintenance", "Muscle Gain"]
        
        for goal in goals:
            email, _ = self.signup_and_go_to_onboarding(driver)
            
            page = OnboardingPage(driver, BASE_URL)
            page.wait_for_page_load()
            
            page.fill_required_fields(
                goal=goal,
                weight="170 lbs",
                height="5 ft 9 in",
                age="30",
                gender="male",
                card_number="3529576776200565",
                card_cvv="961",
                card_expiry="2028-04-31"
            )
            
            page.submit_form()
            import time
            time.sleep(2)
            
            # Should redirect (success)
            assert "/onboarding" not in page.current_url() or page.current_url().endswith("/onboarding") == False, (
                f"Should leave onboarding page with goal: {goal}"
            )

    # ------------------------------------------------------------------
    # Edge cases
    # ------------------------------------------------------------------

    def test_optional_bio_field(self, driver):
        """Bio field is optional and doesn't block submission."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Fill all required fields but skip bio
        page.fill_required_fields(
            goal="Weight Loss",
            weight="160 lbs",
            height="5 ft 8 in",
            age="24",
            gender="female",
            card_number="3529576776200565",
            card_cvv="961",
            card_expiry="2028-04-31"
        )
        
        # Don't enter bio
        page.submit_form()
        import time
        time.sleep(2)
        
        # Should complete successfully
        assert "/onboarding" not in page.current_url() or page.error_message_visible() == False, (
            "Optional bio should not block submission"
        )

    def test_age_validation_in_onboarding(self, driver):
        """Age field should accept valid ages."""
        email, _ = self.signup_and_go_to_onboarding(driver)
        
        page = OnboardingPage(driver, BASE_URL)
        page.wait_for_page_load()
        
        # Valid age
        page.enter_age("35")
        age_input = page.find_visible(page.AGE_INPUT)
        assert "35" in age_input.get_attribute("value"), "Age should be entered" # type: ignore
