import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.edge.options import Options
from selenium.common.exceptions import TimeoutException


FRONTEND_URL = "http://localhost:5173"
CLIENT_EMAIL = "rat8@njit.edu"
CLIENT_PASSWORD = "password"


def wait_for_page_to_fully_load(driver, timeout=10):
    wait = WebDriverWait(driver, timeout)

    wait.until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )

    wait.until(
        lambda d: d.execute_script(
            """
            const images = Array.from(document.images);
            return images.every(img => img.complete);
            """
        )
    )

    time.sleep(2)

def scroll(driver, direction, pause=0.3, step=350):
    """
    Scroll slowly in the given direction.

    direction:
        "down" - scroll from current position to bottom
        "up"   - scroll from current position to top
    """
    direction = direction.lower()

    if direction == "down":
        page_height = driver.execute_script("return document.body.scrollHeight")
        current_position = driver.execute_script("return window.scrollY")

        while current_position < page_height:
            current_position += step
            driver.execute_script(f"window.scrollTo(0, {current_position});")

            page_height = driver.execute_script("return document.body.scrollHeight")
            time.sleep(pause)

    elif direction == "up":
        current_position = driver.execute_script("return window.scrollY")

        while current_position > 0:
            current_position -= step

            if current_position < 0:
                current_position = 0

            driver.execute_script(f"window.scrollTo(0, {current_position});")
            time.sleep(pause)

    else:
        raise ValueError("direction must be either 'down' or 'up'")

def createDriver():
    edge_options = Options()
    edge_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    edge_options.add_argument("--log-level=3")
    driver = webdriver.Edge(options=edge_options)

    return driver

def login(driver):
    """Logs into an existing user, execution stops after reaching '/client'"""

    try:
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        print("Opening landing page...")
        driver.get(FRONTEND_URL)

        # Wait for page to load - every element in the page needs to load
        print("Waiting for landing page to fully load...")
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Log in")))
        print("Landing page loaded successfully")

        # Click the login link in the navbar
        print("Clicking login link...")
        login_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Log in"))
        )
        login_link.click()

        # Wait for login page to load
        wait.until(EC.url_contains("/login"))
        print("Navigated to login page")

        print(f"[✓] Successfully navigated to login page: {driver.current_url}")

        # Verify login page has expected elements
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
        print("[✓] Login form is present on the page")

        # Enter client login credentials
        print("Entering client login credentials...")

        email_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
        )

        email_input.clear()
        email_input.send_keys(CLIENT_EMAIL)

        password_input.clear()
        password_input.send_keys(CLIENT_PASSWORD)

        # Submit login form
        print("Submitting login form...")
        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Wait for dashboard page to load
        wait.until(EC.url_contains("/client"))
        wait_for_page_to_fully_load(driver)

        current_url = driver.current_url
        assert "/client" in current_url, (
            f"Expected URL to contain '/client', got: {current_url}"
        )

        print(f"[✓] Successfully logged in and navigated to dashboard: {current_url}")

    except Exception as e:
        print(f"[x] Login failed: {e}\n")
        raise
    finally:
        print("Finished Logging In")

def signup(driver):
    """Creates a brand new user, execution stops after reaching '/client'"""

    try:
        print("Creating brand new user...")
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        driver.get(FRONTEND_URL)

        # Click the signup link in the navbar
        signup_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Get started"))
        )
        signup_link.click()

        # Wait for signup page to load
        wait.until(EC.url_contains("/signup"))
        wait.until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # ------------------------------------------SIGN UP HERE------------------------------------------
        # Enter client login credentials
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
        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Wait for onboarding page to load
        wait.until(EC.url_contains("/onboarding"))
        wait.until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # ------------------------------------------ONBOARDING------------------------------------------
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

            save_schedule_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Save Schedule']"))
            )
            save_schedule_button.click()

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
        submit_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Complete Onboarding')]")
            )
        )

        # Make sure the button is actually enabled
        assert submit_button.is_enabled(), "Complete Onboarding button is disabled"
        submit_button.click()

        # Wait for client dashboard page to load
        wait.until(EC.url_contains("/client"))
        wait_for_page_to_fully_load(driver)

        printSuccess(f"Successfully created brand new user \n")
    
    except Exception as e:
        printFailure(f"Test failed: {e} \n")
        raise
    
def printSuccess(string):
    GREEN = "\033[32m"
    RESET = "\033[0m"
    print(f"{GREEN}[✓]{RESET} {string}")

def printFailure(string):
    RED = "\033[31m"
    RESET = "\033[0m"
    print(f"{RED}[x]{RESET} {string}")