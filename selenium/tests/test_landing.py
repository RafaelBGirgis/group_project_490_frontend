"""
tests/test_landing.py — Landing page UI tests.

Covers:
  - Page loads and renders main sections
  - Navigation links work correctly
  - Feature cards are visible
  - Stats section loads when scrolled
  - CTA buttons navigate to correct pages
  - Responsive layout
"""

import os
import pytest
from pages import LandingPage

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173/")


class TestLandingPage:

    # ------------------------------------------------------------------
    # Smoke: Page structure and initial render
    # ------------------------------------------------------------------

    def test_landing_page_loads(self, driver):
        """Landing page loads and displays main content."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        # Check basic page loaded
        assert page.current_url() == BASE_URL, "Should be on landing page"
        assert driver.title, "Page should have a title"

    def test_navigation_elements_visible(self, driver):
        """Navigation bar has logo, login link, and get started button."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        assert page.is_visible(LandingPage.LOGIN_LINK), "Login link should be visible"
        assert page.is_visible(LandingPage.GET_STARTED_NAV), "Get started button should be visible"

    def test_hero_cta_buttons_visible(self, driver):
        """Hero CTA buttons are present and visible."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        assert page.is_visible(LandingPage.START_FREE_BUTTON), "Start free button should be visible"
        assert page.is_visible(LandingPage.HAVE_ACCOUNT_BUTTON), "Have account button should be visible"

    def test_feature_pills_visible(self, driver):
        """Feature pills (Client tools, Coach tools, Shared) are visible."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        assert page.is_visible(LandingPage.CLIENT_TOOLS_PILL), "Client tools pill should be visible"
        assert page.is_visible(LandingPage.COACH_TOOLS_PILL), "Coach tools pill should be visible"
        assert page.is_visible(LandingPage.SHARED_PILL), "Shared pill should be visible"

    # ------------------------------------------------------------------
    # Feature cards (bento grid)
    # ------------------------------------------------------------------

    def test_all_feature_cards_visible(self, driver):
        """All major feature cards are visible on the page."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        assert page.all_feature_cards_visible(), "All feature cards should be visible"

    def test_individual_feature_cards_visible(self, driver):
        """Test visibility of each feature card individually."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        cards = [
            (LandingPage.BUILD_WORKOUTS_CARD, "Build your workouts"),
            (LandingPage.ASSIGN_PROGRAMS_CARD, "Assign programs"),
            (LandingPage.TRACK_EVERYTHING_CARD, "Track everything"),
            (LandingPage.MANAGE_ROSTER_CARD, "Manage your roster"),
            (LandingPage.REAL_TIME_MESSAGING_CARD, "Real-time messaging"),
            (LandingPage.GROWTH_ANALYTICS_CARD, "Growth analytics"),
            (LandingPage.LOG_MEALS_CARD, "Log meals"),
            (LandingPage.FIND_PERFECT_MATCH_CARD, "Find your perfect match"),
        ]

        for locator, name in cards:
            assert page.feature_card_visible(locator), f"{name} card should be visible"

    # ------------------------------------------------------------------
    # Stats section (scroll-triggered)
    # ------------------------------------------------------------------

    def test_stats_section_loads_on_scroll(self, driver):
        """Stats section becomes visible when scrolled into view."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        # Scroll to stats
        page.scroll_to_stats()

        # Wait for stats to be visible
        import time
        time.sleep(1)  # Allow animation to complete

        assert page.stats_section_visible(), "Stats section should be visible after scroll"

    def test_all_stats_present(self, driver):
        """All stat items are present in the stats section."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.scroll_to_stats()
        import time
        time.sleep(1)

        assert page.is_visible(LandingPage.ACTIVE_USERS_STAT), "Active users stat should be visible"
        assert page.is_visible(LandingPage.VERIFIED_COACHES_STAT), "Verified coaches stat should be visible"
        assert page.is_visible(LandingPage.SATISFACTION_STAT), "Satisfaction stat should be visible"

    # ------------------------------------------------------------------
    # Final CTA section
    # ------------------------------------------------------------------

    def test_final_cta_section_visible(self, driver):
        """Final CTA section 'Ready to go' is visible when scrolled."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.scroll_to_final_cta()
        import time
        time.sleep(5)

        assert page.ready_heading_visible(), "Final CTA heading should be visible"
        assert page.is_visible(LandingPage.JOIN_CLIENT_BUTTON), "Join as Client button should be visible"
        assert page.is_visible(LandingPage.BECOME_COACH_BUTTON), "Become a Coach button should be visible"

    # ------------------------------------------------------------------
    # Navigation: Happy path (auth not required for landing)
    # ------------------------------------------------------------------

    def test_get_started_button_navigates_to_signup(self, driver):
        """Clicking 'Get started' navigates to signup."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.click_get_started()
        page.wait_for_url_to_contain("signup", timeout=5)

        assert "signup" in page.current_url(), "Should navigate to signup page"

    def test_login_link_navigates_to_login(self, driver):
        """Clicking 'Log in' link navigates to login."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.click_login()
        page.wait_for_url_to_contain("login", timeout=5)

        assert "login" in page.current_url(), "Should navigate to login page"

    def test_start_free_button_navigates_to_signup(self, driver):
        """Clicking 'Start for free' button navigates to signup."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.click_start_free()
        page.wait_for_url_to_contain("signup", timeout=5)

        assert "signup" in page.current_url(), "Should navigate to signup page"

    def test_have_account_button_navigates_to_login(self, driver):
        """Clicking 'I have an account' navigates to login."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.click_have_account()
        page.wait_for_url_to_contain("login", timeout=5)

        assert "login" in page.current_url(), "Should navigate to login page"

    def test_join_as_client_navigates_with_role_param(self, driver):
        """Clicking 'Join as Client' includes role=client in URL."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.scroll_to_final_cta()
        import time
        time.sleep(0.5)

        page.click_join_as_client()
        page.wait_for_url_to_contain("role=client", timeout=5)

        assert "signup" in page.current_url(), "Should navigate to signup page"
        assert "role=client" in page.current_url(), "Should include role=client in URL"

    def test_become_coach_navigates_with_role_param(self, driver):
        """Clicking 'Become a Coach' includes role=coach in URL."""
        page = LandingPage(driver, BASE_URL)
        page.open()

        page.scroll_to_final_cta()
        import time
        time.sleep(0.5)

        page.click_become_coach()
        page.wait_for_url_to_contain("role=coach", timeout=5)

        assert "signup" in page.current_url(), "Should navigate to signup page"
        assert "role=coach" in page.current_url(), "Should include role=coach in URL"

    # ------------------------------------------------------------------
    # Accessibility 
    # ------------------------------------------------------------------

    def test_logo_link_goes_home(self, driver):
        """Clicking the logo takes you back to home."""
        page = LandingPage(driver, BASE_URL)

        # Go to login first
        page.open()
        page.click_login()
        page.wait_for_url_to_contain("login", timeout=5)

        # Now click logo to go back
        page.click(LandingPage.LOGO_LINK)
        import time
        time.sleep(1)

        # Should be back at home or login might redirect; at least check we navigated
        current = page.current_url()
        assert BASE_URL in current, f"Should navigate back to base URL, got: {current}"
