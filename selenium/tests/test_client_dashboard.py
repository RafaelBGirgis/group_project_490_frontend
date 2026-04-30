"""
tests/test_client_dashboard.py — Client dashboard UI tests.

Covers:
  - Page loads and requires authentication
  - Main sections are visible
  - Daily check-in banner displays
  - Navigation to key features (find coach, workouts, availability, meals)
  - Day tabs work for workouts
"""

import os
import pytest
from pages import ClientDashboardPage

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")


class TestClientDashboard:

    # ------------------------------------------------------------------
    # Auth: Unauthenticated user redirected
    # ------------------------------------------------------------------

    def test_unauthenticated_user_redirected_to_login(self, driver):
        """Unauthenticated user trying to access /client redirects to /login."""
        page = ClientDashboardPage(driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert "/login" in page.current_url(), (
            f"Unauthenticated user should redirect to /login, got: {page.current_url()}"
        )

    # ------------------------------------------------------------------
    # Smoke: Page loads for authenticated user
    # ------------------------------------------------------------------

    def test_authenticated_user_can_access_dashboard(self, auth_driver):
        """Authenticated user can access the client dashboard."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        assert page.is_authenticated(), "User should be authenticated and on dashboard"
        assert "/client" in page.current_url(), "Should be on /client route"

    def test_dashboard_page_loads_with_greeting(self, auth_driver):
        """Dashboard loads and displays personalized greeting."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.is_visible(page.GREETING_CARD, timeout=5), (
            "Greeting card with user's name should be visible"
        )

    # ------------------------------------------------------------------
    # Page Structure
    # ------------------------------------------------------------------

    def test_all_main_sections_visible(self, auth_driver):
        """All main dashboard sections are visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(2)

        assert page.main_sections_visible(), (
            "All main sections (greeting, stats, workout, coach, availability, nutrition) should be visible"
        )

    def test_fitness_stats_visible(self, auth_driver):
        """Fitness stats (steps, calories, progress) are visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.fitness_stats_visible(), (
            "Fitness stats cards should be visible"
        )

    def test_daily_check_in_banner_visible(self, auth_driver):
        """Daily check-in banner is visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.is_check_in_banner_visible(), (
            "Daily check-in banner should be visible at top"
        )

    # ------------------------------------------------------------------
    # Workout Section
    # ------------------------------------------------------------------

    def test_workout_section_visible(self, auth_driver):
        """Today's workout section is visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.workout_section_visible(), (
            "Today's workout section should be visible"
        )

    def test_day_tabs_visible_in_workout(self, auth_driver):
        """Day tabs are visible for selecting different days."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        # Check that at least one day button exists
        assert page.is_visible(page.DAY_TABS, timeout=2), (
            "Day tabs should be visible for selecting workout days"
        )

    # ------------------------------------------------------------------
    # Coach Section
    # ------------------------------------------------------------------

    def test_coach_section_visible(self, auth_driver):
        """Coach section is visible (either with coach or 'Find a Coach' CTA)."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.coach_section_visible(), (
            "Coach section should be visible"
        )

    def test_find_coach_button_present_if_no_coach(self, auth_driver):
        """If no coach, 'Find a Coach' button is visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        has_coach = page.has_coach()
        if not has_coach:
            assert page.find_coach_cta_visible(), (
                "If no coach assigned, 'Find a Coach' CTA should be visible"
            )

    def test_find_coach_button_navigates(self, auth_driver):
        """Clicking 'Find a Coach' navigates to find-coach page."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        # Only test if find coach button is visible
        if page.find_coach_cta_visible():
            page.click_find_coach()
            page.wait_for_url_to_contain("find-coach", timeout=5)

            assert "find-coach" in page.current_url(), (
                "Should navigate to find-coach page"
            )

    # ------------------------------------------------------------------
    # Availability Section
    # ------------------------------------------------------------------

    def test_availability_section_visible(self, auth_driver):
        """Availability section is visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.availability_section_visible(), (
            "Availability section should be visible"
        )

    def test_edit_availability_button_exists(self, auth_driver):
        """Edit availability button is present."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.is_visible(page.EDIT_AVAILABILITY_BUTTON, timeout=2), (
            "Edit availability button should be present"
        )

    # ------------------------------------------------------------------
    # Nutrition Section
    # ------------------------------------------------------------------

    def test_nutrition_section_visible(self, auth_driver):
        """Nutrition section is visible."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.meals_section_visible(), (
            "Nutrition/meals section should be visible"
        )

    def test_log_meal_button_present(self, auth_driver):
        """Log meal button is present in nutrition section."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.is_visible(page.LOG_MEAL_BUTTON, timeout=2), (
            "Log meal button should be present"
        )

    # ------------------------------------------------------------------
    # Navigation: Browse Workouts
    # ------------------------------------------------------------------

    def test_browse_workouts_button_visible(self, auth_driver):
        """Browse workouts button is visible in workout section."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        assert page.is_visible(page.BROWSE_WORKOUTS_BUTTON, timeout=2), (
            "Browse workouts button should be visible"
        )

    def test_browse_workouts_navigates(self, auth_driver):
        """Clicking browse workouts navigates to workouts page."""
        page = ClientDashboardPage(auth_driver, BASE_URL)
        page.open()

        import time
        time.sleep(1)

        if page.is_visible(page.BROWSE_WORKOUTS_BUTTON, timeout=2):
            page.click_browse_workouts()
            import time
            time.sleep(1)

            current_url = page.current_url()
            assert "workouts" in current_url, (
                f"Should navigate to workouts page, got: {current_url}"
            )
