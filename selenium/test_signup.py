"""
Simple Selenium script to navigate from landing page to login page.
Browser: Microsoft Edge
Frontend: http://localhost:5173
"""

import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options
from selenium.common.exceptions import TimeoutException

from helpers import wait_for_page_to_fully_load
from helpers import scroll
from helpers import printSuccess

FRONTEND_URL = "http://localhost:5173"

def test_signup():
    """Sign up an user"""

    edge_options = Options()
    edge_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    edge_options.add_argument("--log-level=3")

    driver = webdriver.Edge(options=edge_options)

    try:
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        print("Opening landing page...")
        driver.get(FRONTEND_URL)

        # Wait for page to load - every element in the page needs to load
        print("Waiting for landing page to fully load...")
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Get started")))
        print("Landing page loaded successfully")

        # Click the signup link in the navbar
        print("Clicking signup link...")
        signup_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Get started"))
        )

        previous_url = driver.current_url
        signup_link.click()

        # Wait for signup page to load
        wait.until(lambda d: d.current_url != previous_url)
        wait_for_page_to_fully_load(driver)
        print("Navigated to signup page")

        # Verify we're on the signup page
        current_url = driver.current_url
        assert "/signup" in current_url, (
            f"Expected URL to contain '/signup', got: {current_url}"
        )
        print(f"[✓] Successfully navigated to signup page: {current_url}")

        # ------------------------------------------SIGN UP HERE------------------------------------------
        # Verify login page has expected elements
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
        print("Signup form is present on the page")

        # Enter client login credentials
        print("Entering client onboarding credentials...")

        name_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='name']"))
        )
        email_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']"))
        )
        age_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='age']"))
        )
        gender_select = Select(
            wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "select[name='gender']"))
            )
        )
        password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='password']"))
        )
        confirm_password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='confirmPassword']"))
        )
        pfp_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='pfpUrl']"))
        )
        bio_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[name='bio']"))
        )

        name_input.clear()
        name_input.send_keys("John Doe")

        email_input.clear()
        email_input.send_keys(f"johndoe_{int(time.time())}@email.com")

        age_input.clear()
        age_input.send_keys("25")

        gender_select.select_by_visible_text("Male")
        
        password_input.clear()
        password_input.send_keys("password")

        confirm_password_input.clear()
        confirm_password_input.send_keys("password")

        pfp_input.clear()
        pfp_input.send_keys("https://upload.wikimedia.org/wikipedia/en/e/e9/New_Jersey_IT_seal.svg")

        bio_input.clear()
        bio_input.send_keys("This is a Selenium test account.")

        # Submit signup form
        print("Submitting signup form...")
        previous_url = driver.current_url

        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Wait for onboarding page to load
        wait.until(lambda d: d.current_url != previous_url)
        wait_for_page_to_fully_load(driver)

        current_url = driver.current_url
        assert "/onboarding" in current_url, (
            f"Expected URL to contain '/onboarding', got: {current_url}"
        )

        print(f"Successfully signed up and navigated to onboarding: {current_url}")

        # ------------------------------------------ONBOARDING------------------------------------------
        # Verify onboarding form is present
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
        print("Onboarding form is present on the page")

        print("Entering onboarding information...")

        # Select primary goal
        primary_goal_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "//select[option[contains(., 'Select a primary goal')]]")
                )
            )
        )
        primary_goal_select.select_by_visible_text("Muscle Gain")

        # Fill baseline metrics
        weight_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Weight (e.g. 165 lbs)']")
            )
        )
        height_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Height (e.g. 5 ft 10 in)']")
            )
        )

        weight_input.clear()
        weight_input.send_keys("165 lbs")

        height_input.clear()
        height_input.send_keys("5 ft 10 in")

        # Select gender
        gender_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "//select[option[contains(., 'Gender')]]")
                )
            )
        )
        gender_select.select_by_value("male")

        # Optional bio
        bio_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "textarea[placeholder='Biography for coach (optional)']")
            )
        )
        bio_input.clear()
        bio_input.send_keys("This is a Selenium onboarding test account, onboarding bio.")

        # --------------------------------------AVAILABILITY--------------------------------------
        print("Selecting training availability...")

        try:
            # Click "+ Add Time Slot"
            add_slot_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(normalize-space(), 'Add Time Slot')]"))
            )
            add_slot_button.click()

            # Click "9AM" in the time picker
            time_slot = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='9AM']"))
            )
            time_slot.click()

            # Click the Monday cell in the 9AM row
            wait.until(EC.presence_of_element_located((By.XPATH, "//div[normalize-space()='9AM']")))
            time_cell = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[normalize-space()='9AM']/following-sibling::div[1]"))
            )
            time_cell.click()

            print("Selected a training availability slot")

            save_schedule_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Save Schedule']"))
            )
            save_schedule_button.click()

            print("Saved availability schedule")

            time.sleep(2)

        except TimeoutException:
            raise AssertionError(
                "Could not find a clickable training availability slot. "
                "Check the AvailabilityDetail component and add a stable selector like "
                "data-testid='availability-Mon-9AM'."
            )

        # Fill payment information
        card_number_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='Card number']"))
        )
        card_cvv_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='CVV']"))
        )
        card_expiry_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='date']"))
        )

        card_number_input.clear()
        card_number_input.send_keys("38310694570788")

        card_cvv_input.clear()
        card_cvv_input.send_keys("097")

        card_expiry_input.clear()
        card_expiry_input.send_keys("12/31/2027")

        # Submit onboarding form
        print("Submitting onboarding form...")
        previous_url = driver.current_url

        submit_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Complete Onboarding')]")
            )
        )

        submit_button.click()

        # Wait for client dashboard page to load
        wait.until(lambda d: d.current_url != previous_url)
        wait_for_page_to_fully_load(driver)

        current_url = driver.current_url

        assert "/client" in current_url, (
            f"Expected URL to contain '/client', got: {current_url}"
        )

        printSuccess(f"Successfully completed onboarding and navigated to client dashboard: {current_url}")


    except Exception as e:
        print(f"[x] Test failed: {e} \n")
        raise
    finally:
        driver.quit()
        print("Browser closed \n")

if __name__ == "__main__":
    test_signup()