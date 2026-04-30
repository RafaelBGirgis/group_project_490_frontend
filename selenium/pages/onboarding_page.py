"""
pages/onboarding_page.py — Page Object for the Client Onboarding page.

Encapsulates selectors and actions for the onboarding survey after signup.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class OnboardingPage(BasePage):
    URL = "/onboarding"

    # --- Page structure ---
    PAGE_HEADING = (By.XPATH, "//h1[contains(text(), 'Client Onboarding')]")
    PAGE_SUBHEADING = (By.XPATH, "//p[contains(text(), 'Complete all required fields')]")
    LOADING_MESSAGE = (By.XPATH, "//div[contains(text(), 'Loading onboarding')]")
    ERROR_MESSAGE = (By.XPATH, "//div[contains(@class, 'border-red') or contains(@class, 'bg-red')]")
    SUCCESS_MESSAGE = (By.XPATH, "//div[contains(text(), 'success') or contains(text(), 'Success')]")

    # --- Form sections ---
    PRIMARY_GOAL_SELECT = (By.XPATH, "//select[contains(@class, 'rounded-lg')]")
    
    # Fitness metrics
    NAME_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Name')]")
    EMAIL_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Email')]")
    AGE_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Age')]")
    WEIGHT_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Weight')]")
    HEIGHT_INPUT = (By.XPATH, "//input[contains(@placeholder, 'Height')]")
    BIO_INPUT = (By.XPATH, "//textarea[contains(@placeholder, 'Bio') or contains(@placeholder, 'Biography')]")
    GENDER_SELECT = (By.XPATH, "//select[option[normalize-space()='Gender']]"
    )

    # Training availability component - time slots
    AVAILABILITY_SECTION = (By.XPATH, "//h2[contains(text(), 'Training Availability')]")
    TIME_SLOT_BUTTONS = (By.XPATH, "//button[contains(@class, 'slot') or contains(@class, 'time')]")

    # Payment information
    CARD_NUMBER_INPUT = (By.XPATH, "//input[@placeholder='Card number']")
    CARD_CVV_INPUT = (By.XPATH, "//input[@placeholder='CVV']")
    CARD_EXPIRY_INPUT = (By.XPATH, "//input[@type='date']")

    # Submit button
    COMPLETE_BUTTON = (By.XPATH, "//button[contains(text(), 'Complete Onboarding')]")

    # --- Actions ---

    def open(self):
        """Navigate to onboarding page."""
        super().open(self.URL)

    def wait_for_page_load(self, timeout: int = 10):
        """Wait for page to load and loading state to finish."""
        self.find_visible(self.PAGE_HEADING, timeout=timeout)
        # Wait for loading to disappear
        import time
        time.sleep(0.5)

    def select_primary_goal(self, goal: str):
        """
        Select primary goal from dropdown.
        
        Options: "Weight Loss", "Maintenance", "Muscle Gain"
        """
        select_el = self.find_visible(self.PRIMARY_GOAL_SELECT)
        select_el.send_keys(goal)

    def enter_name(self, name: str):
        """Enter name (usually read-only, prefilled from signup)."""
        el = self.find_visible(self.NAME_INPUT, timeout=2)
        if el.get_attribute("readonly"):
            return  # Field is read-only
        self.type(self.NAME_INPUT, name)

    def enter_email(self, email: str):
        """Enter email (usually read-only, prefilled from signup)."""
        el = self.find_visible(self.EMAIL_INPUT, timeout=2)
        if el.get_attribute("readonly"):
            return  # Field is read-only

    def enter_age(self, age: str):
        """Enter age."""
        self.type(self.AGE_INPUT, age)

    def enter_weight(self, weight: str):
        """Enter weight (e.g., '165 lbs')."""
        self.type(self.WEIGHT_INPUT, weight)

    def enter_height(self, height: str):
        """Enter height (e.g., '5 ft 10 in')."""
        self.type(self.HEIGHT_INPUT, height)

    def select_gender(self, gender: str):
        """
        Select gender from dropdown.
        
        Options: "male", "female", "non-binary", "prefer_not_to_say"
        """
        gender_select = self.find_visible(self.GENDER_SELECT, timeout=3)
        gender_select.send_keys(gender)

    def enter_bio(self, bio: str):
        """Enter bio text (optional)."""
        self.type(self.BIO_INPUT, bio)

    def set_training_availability(self, day: str, times: list[str]):
        """
        Set training availability for a specific day.
        
        Args:
            day: Day name (e.g., "Mon", "Tue", etc.)
            times: List of times (e.g., ["9AM", "5PM"])
        """
        # This is complex due to custom component, may need manual clicking
        # Typically buttons or checkboxes represent each time slot
        pass

    def enter_card_number(self, card_number: str):
        """Enter card number."""
        self.type(self.CARD_NUMBER_INPUT, card_number)

    def enter_card_cvv(self, cvv: str):
        """Enter card CVV."""
        self.type(self.CARD_CVV_INPUT, cvv)

    def enter_card_expiry(self, expiry: str):
        """Enter card expiry date (format: YYYY-MM-DD)."""
        self.type(self.CARD_EXPIRY_INPUT, expiry)

    def fill_required_fields(self, goal: str, weight: str, height: str, age: str, gender: str, 
                            card_number: str, card_cvv: str, card_expiry: str):
        """
        Fill all required onboarding fields.
        
        Args:
            goal: Primary goal
            weight: Weight
            height: Height
            age: Age
            gender: Gender
            card_number: Card number
            card_cvv: CVV
            card_expiry: Expiry (YYYY-MM-DD)
        """
        self.select_primary_goal(goal)
        self.enter_weight(weight)
        self.enter_height(height)
        self.enter_age(age)
        self.select_gender(gender)
        self.enter_card_number(card_number)
        self.enter_card_cvv(card_cvv)
        self.enter_card_expiry(card_expiry)

    def submit_form(self):
        """Click the 'Complete Onboarding' button."""
        self.click(self.COMPLETE_BUTTON)

    # --- Assertions helpers ---

    def page_heading_visible(self) -> bool:
        """Check if page heading is visible."""
        return self.is_visible(self.PAGE_HEADING)

    def all_required_fields_visible(self) -> bool:
        """Check if all required fields are visible."""
        fields = [
            self.is_visible(self.PRIMARY_GOAL_SELECT, timeout=2),
            self.is_visible(self.WEIGHT_INPUT, timeout=2),
            self.is_visible(self.HEIGHT_INPUT, timeout=2),
            self.is_visible(self.CARD_NUMBER_INPUT, timeout=2),
            self.is_visible(self.CARD_CVV_INPUT, timeout=2),
            self.is_visible(self.CARD_EXPIRY_INPUT, timeout=2),
        ]
        return all(fields)

    def error_message_visible(self) -> bool:
        """Check if error message is visible."""
        return self.is_visible(self.ERROR_MESSAGE, timeout=3)

    def get_error_message(self) -> str:
        """Get error message text."""
        try:
            return self.get_text(self.ERROR_MESSAGE)
        except:
            return ""

    def submit_button_enabled(self) -> bool:
        """Check if submit button is enabled."""
        btn = self.find_visible(self.COMPLETE_BUTTON, timeout=2)
        return not btn.get_attribute("disabled")
