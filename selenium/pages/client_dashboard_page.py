"""
pages/client_dashboard_page.py — Page Object for the Client Dashboard.

Encapsulates selectors and actions for the authenticated client dashboard.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class ClientDashboardPage(BasePage):
    URL = "/client"

    # --- Navigation ---
    NAVBAR = (By.XPATH, "//nav")
    USER_INITIALS_BUTTON = (By.XPATH, "//button[contains(@class, 'font-bold') or contains(text(), '?')]")

    # --- Daily Check-in Banner ---
    CHECK_IN_BANNER = (By.XPATH, "//div[contains(text(), 'Daily check-in')]")
    CHECK_IN_BUTTON = (By.XPATH, "//button[contains(text(), 'Check-in') or contains(text(), 'Open') or contains(text(), 'Review')]")

    # --- Greeting & Stats Cards ---
    GREETING_CARD = (By.XPATH, "//h2[contains(text(), 'Good')] | //h2[contains(., 'Morning')] | //h2[contains(., 'Afternoon')] | //h2[contains(., 'Evening')]")
    STEPS_STAT = (By.XPATH, "//p[contains(text(), 'STEPS TODAY')]")
    CALORIES_BURNED_STAT = (By.XPATH, "//p[contains(text(), 'CALORIES BURNED')]")
    CALORIES_PROGRESS = (By.XPATH, "//p[contains(text(), 'Calories')]")
    WORKOUT_PROGRESS = (By.XPATH, "//p[contains(text(), 'Progress')]")

    # --- Workout Section ---
    WORKOUT_SECTION_HEADER = (By.XPATH, "//p[contains(text(), 'WORKOUT & COACH')]")
    TODAYS_WORKOUT_TITLE = (By.XPATH, "//p[contains(text(), \"Today's Workout\")]")
    DAY_TABS = (By.XPATH, "//button[contains(@class, 'day') or contains(text(), 'Mon') or contains(text(), 'Tue')]")
    VIEW_ALL_WORKOUTS_LINK = (By.XPATH, "//a[contains(text(), 'View all')] | //button[contains(text(), 'View all')]")
    LOG_ACTIVITY_BUTTON = (By.XPATH, "//button[contains(text(), 'Log')]")
    BROWSE_WORKOUTS_BUTTON = (By.XPATH, "//button[contains(text(), 'Browse')]")

    # --- Coach Section ---
    COACH_SECTION = (By.XPATH, "//p[contains(text(), 'My Coach')] | //p[contains(text(), 'No coach')]")
    FIND_COACH_BUTTON = (By.XPATH, "//button[contains(text(), 'Find a Coach')]")
    COACH_NAME = (By.XPATH, "//div[contains(@class, 'My Coach')]//p[@class='text-white']")
    MESSAGE_COACH_BUTTON = (By.XPATH, "//button[contains(text(), '💬')] | //button[contains(text(), 'Message')]")
    END_COACH_BUTTON = (By.XPATH, "//button[contains(text(), 'End')]")

    # --- Availability Section ---
    AVAILABILITY_SECTION = (By.XPATH, "//p[contains(text(), 'Availability')]")
    EDIT_AVAILABILITY_BUTTON = (By.XPATH, "//button[contains(text(), 'Edit Schedule')]")
    AVAILABILITY_GRID = (By.XPATH, "//div[contains(text(), 'Mon')]")

    # --- Nutrition Section ---
    NUTRITION_SECTION_HEADER = (By.XPATH, "//p[contains(text(), 'NUTRITION DETAIL')]")
    TODAYS_MEALS = (By.XPATH, "//p[contains(text(), \"Today's Meals\")]")
    LOG_MEAL_BUTTON = (By.XPATH, "//button[contains(text(), 'Log Meal')]")

    # --- Overlays/Modals ---
    OVERLAY_CLOSE_BUTTON = (By.XPATH, "//button[contains(text(), '✕')] | //button[@aria-label='Close']")
    MODAL = (By.XPATH, "//div[contains(@class, 'overlay') or contains(@class, 'modal')]")

    # --- Actions ---

    def open(self):
        """Navigate to client dashboard."""
        super().open(self.URL)

    def is_authenticated(self) -> bool:
        """Check if user is on authenticated dashboard."""
        return self.is_visible(self.NAVBAR, timeout=5)

    def is_check_in_banner_visible(self) -> bool:
        """Check if daily check-in banner is visible."""
        return self.is_visible(self.CHECK_IN_BANNER, timeout=3)

    def click_check_in(self):
        """Click the check-in button."""
        self.click(self.CHECK_IN_BUTTON)

    def click_find_coach(self):
        """Click the 'Find a Coach' button."""
        self.click(self.FIND_COACH_BUTTON)

    def click_browse_workouts(self):
        """Click the 'Browse & Build Workouts' button."""
        self.click(self.BROWSE_WORKOUTS_BUTTON)

    def click_edit_availability(self):
        """Click the 'Edit Schedule' button."""
        self.click(self.EDIT_AVAILABILITY_BUTTON)

    def click_log_meal(self):
        """Click the 'Log Meal' button."""
        self.click(self.LOG_MEAL_BUTTON)

    def click_message_coach(self):
        """Click the message coach button."""
        self.click(self.MESSAGE_COACH_BUTTON)

    def click_day_tab(self, day: str):
        """Click a specific day tab (e.g., 'Mon', 'Tue')."""
        day_button = (By.XPATH, f"//button[contains(text(), '{day}')]")
        self.click(day_button)

    def close_overlay(self):
        """Close any open overlay/modal."""
        try:
            self.click(self.OVERLAY_CLOSE_BUTTON)
        except:
            pass

    # --- Assertions helpers ---

    def main_sections_visible(self) -> bool:
        """Check if all main dashboard sections are visible."""
        sections = [
            self.is_visible(self.GREETING_CARD, timeout=2),
            self.is_visible(self.STEPS_STAT, timeout=2),
            self.is_visible(self.WORKOUT_SECTION_HEADER, timeout=2),
            self.is_visible(self.COACH_SECTION, timeout=2),
            self.is_visible(self.AVAILABILITY_SECTION, timeout=2),
            self.is_visible(self.NUTRITION_SECTION_HEADER, timeout=2),
        ]
        return all(sections)

    def fitness_stats_visible(self) -> bool:
        """Check if fitness stats (steps, calories, progress) are visible."""
        stats = [
            self.is_visible(self.STEPS_STAT, timeout=2),
            self.is_visible(self.CALORIES_BURNED_STAT, timeout=2),
            self.is_visible(self.CALORIES_PROGRESS, timeout=2),
            self.is_visible(self.WORKOUT_PROGRESS, timeout=2),
        ]
        return all(stats)

    def workout_section_visible(self) -> bool:
        """Check if workout section is visible."""
        return self.is_visible(self.TODAYS_WORKOUT_TITLE, timeout=2)

    def coach_section_visible(self) -> bool:
        """Check if coach section is visible."""
        return self.is_visible(self.COACH_SECTION, timeout=2)

    def has_coach(self) -> bool:
        """Check if user has a coach assigned."""
        try:
            return self.is_visible(self.COACH_NAME, timeout=2) and self.is_visible(self.MESSAGE_COACH_BUTTON, timeout=2)
        except:
            return False

    def find_coach_cta_visible(self) -> bool:
        """Check if 'Find a Coach' CTA is visible."""
        return self.is_visible(self.FIND_COACH_BUTTON, timeout=2)

    def availability_section_visible(self) -> bool:
        """Check if availability section is visible."""
        return self.is_visible(self.AVAILABILITY_SECTION, timeout=2)

    def meals_section_visible(self) -> bool:
        """Check if meals section is visible."""
        return self.is_visible(self.TODAYS_MEALS, timeout=2)
