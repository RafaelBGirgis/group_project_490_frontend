import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains

from helpers import createDriver
from helpers import signup
from helpers import wait_for_page_to_fully_load
from helpers import printSuccess
from helpers import printFailure
from helpers import scroll


FRONTEND_URL = "http://localhost:5173"


def wait_for_coaches_to_load(driver, wait):
    """Wait until at least one coach card is present on the Find Coach page."""

    wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//div[.//button[contains(normalize-space(), 'Quick Details')] "
                "and .//button[contains(normalize-space(), 'View Profile')]]"
            )
        )
    )

    time.sleep(2)


def find_coach_card_by_name(driver, wait, coach_name):
    """Find a coach card by visible coach name."""

    return wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                f"//div[contains(@class, 'rounded-2xl')][.//*[normalize-space()='{coach_name}']]",
            )
        )
    )


def click_button_inside_card(card, button_text):
    """Click a button inside a coach card by visible button text."""

    button = card.find_element(
        By.XPATH,
        f".//button[contains(normalize-space(), '{button_text}')]"
    )
    button.click()
    return button


def test_client_find_coach():
    driver = createDriver()

    try:
        wait = WebDriverWait(driver, 10)

        # Create brand new user
        signup(driver)

        # Navigate to /find-coach
        print("Navigating to Find Coach page...")
        driver.get(f"{FRONTEND_URL}/find-coach")

        wait.until(EC.url_contains("/find-coach"))
        wait_for_page_to_fully_load(driver)

        wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Find a Coach']")
            )
        )

        wait_for_coaches_to_load(driver, wait)

        print(f"Successfully navigated to: {driver.current_url}")

        # Test filter by gender
        print("Testing gender filter...")

        gender_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//span[normalize-space()='Gender']/following-sibling::select[1]",
                    )
                )
            )
        )

        gender_select.select_by_value("female")
        wait_for_coaches_to_load(driver, wait)
        print("Filtered coaches by gender: female")

        # Test filter by highest rating, then most reviewed
        print("Testing sort dropdown...")

        sort_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//span[normalize-space()='Sort by']/following-sibling::select[1]",
                    )
                )
            )
        )

        sort_select.select_by_value("rating_count")
        wait_for_coaches_to_load(driver, wait)
        print("Sorted coaches by most reviewed")

        # Test Quick Details
        print("Testing Quick Details and Hide Details...")
        time.sleep(1)

        quick_details_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Quick Details']"))
        )
        ActionChains(driver).move_to_element(quick_details_button).perform()
        time.sleep(1)
        quick_details_button.click()
        print("Quick Details opened successfully")
        
        time.sleep(1)
        
        hide_details_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Hide Details']")
            )
        )
        ActionChains(driver).move_to_element(hide_details_button).perform()
        time.sleep(1)
        hide_details_button.click()
        print("Hide Details closed successfully")
        time.sleep(2)

        # Test View Profile
        print("Testing View Profile...")
        view_profile_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='View Profile']")
            )
        )
        ActionChains(driver).move_to_element(view_profile_button).perform()
        time.sleep(1)
        view_profile_button.click()
        
        wait.until(EC.url_contains("/coaches"))
        wait_for_page_to_fully_load(driver)
        wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Coach Profile']")
            )
        )
        time.sleep(1)
        print(f"Successfully opened coach profile: {driver.current_url}")

        # Scroll through profile, then exit
        print("Scrolling through coach profile...")
        scroll(driver, "down", 0.01, 20)
        scroll(driver, "up", 0.01, 20)
        time.sleep(1)

        print("Going back to Find Coach page...")
        driver.back()

        wait.until(EC.url_contains("/find-coach"))
        wait_for_page_to_fully_load(driver)
        wait_for_coaches_to_load(driver, wait)

        print("Returned to Find Coach page successfully")
        time.sleep(1)

        # Test Request 'Wii Fit Trainer' Coach
        print("Testing Request Coach for Wii Fit Trainer...")

        search_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Search by coach name']")
            )
        )

        search_input.clear()
        search_input.send_keys("Wii Fit Trainer")

        time.sleep(1)
        wait_for_coaches_to_load(driver, wait)

        wii_fit_card = find_coach_card_by_name(driver, wait, "Wii Fit Trainer")

        request_button = wii_fit_card.find_element(
            By.XPATH,
            ".//button[contains(normalize-space(), 'Request Coach') or contains(normalize-space(), 'Cancel Request')]"
        )

        request_button_text = request_button.text.strip()

        if "Request Coach" in request_button_text:
            request_button.click()

            wait.until(
                lambda d: "Cancel Request" in wii_fit_card.text
                or "Sending..." not in wii_fit_card.text
            )

            assert "Cancel Request" in wii_fit_card.text, (
                "Expected Wii Fit Trainer card to show 'Cancel Request' after requesting coach."
            )

            print("Successfully requested Wii Fit Trainer as coach")

        else:
            print("Wii Fit Trainer was already requested")

        # -------------------------------------Accepting Request-------------------------------------
        #
        # This cannot be completed from the client Find Coach page alone.
        # To test acceptance, we need either:
        # 1. a coach login helper that logs in as Wii Fit Trainer and accepts the request, or
        # 2. a backend/API helper that approves the request directly.
        
        print("Skipping coach acceptance step: requires coach-side login or backend helper.")

        # Reload page
        print("Reloading Find Coach page...")
        driver.refresh()

        wait_for_page_to_fully_load(driver)
        wait_for_coaches_to_load(driver, wait)

        assert "/find-coach" in driver.current_url, (
            f"Expected to still be on '/find-coach', got: {driver.current_url}"
        )

        printSuccess(f"No errors: {driver.current_url}")

    except Exception as e:
        printFailure(f"Test failed: {e}")
        raise

    finally:
        driver.quit()
        print("Browser closed \n")


if __name__ == "__main__":
    test_client_find_coach()