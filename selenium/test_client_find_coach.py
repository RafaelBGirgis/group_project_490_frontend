import time
from pathlib import Path

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait

from helpers import createDriver
from helpers import delete_account
from helpers import printFailure
from helpers import printNotice
from helpers import printSuccess
from helpers import scroll
from helpers import wait_for_page_to_fully_load
from test_signup import test_signup


FRONTEND_URL = "http://localhost:5173"
WII_FIT_TRAINER_EMAIL = "wiifittrainer@gmail.com"
WII_FIT_TRAINER_PASSWORD = "password"


def wait_for_coaches_to_load(driver, wait):
    """Wait until at least one coach card is present on the Find Coach page."""

    wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//div[.//button[contains(normalize-space(), 'View Profile')] "
                "and .//button[contains(normalize-space(), 'Message')]]"
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


def login_as_coach(coach_driver, email, password):
    """Log into an existing coach account and wait for the coach dashboard."""

    coach_wait = WebDriverWait(coach_driver, 10)

    print("Opening coach login page...")
    coach_driver.get(f"{FRONTEND_URL}/login")

    coach_wait.until(EC.url_contains("/login"))
    wait_for_page_to_fully_load(coach_driver)
    coach_wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))

    email_input = coach_wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='email']"))
    )
    password_input = coach_wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='password']"))
    )

    print("Entering coach login credentials...")
    email_input.clear()
    email_input.send_keys(email)

    password_input.clear()
    password_input.send_keys(password)

    print("Submitting coach login form...")
    submit_button = coach_wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
    )
    submit_button.click()

    coach_wait.until(
        lambda current_driver: any(
            route in current_driver.current_url
            for route in ("/client", "/coach", "/admin")
        )
    )
    coach_driver.get(f"{FRONTEND_URL}/coach")
    coach_wait.until(EC.url_contains("/coach"))
    wait_for_page_to_fully_load(coach_driver)

    coach_wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//h3[contains(normalize-space(), 'Client Requests')]")
        )
    )

    print(f"Coach logged in successfully: {coach_driver.current_url}")


def test_client_find_coach(driver=None, keep_driver=False):
    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False

    if driver is None:
        client_driver = createDriver()
        is_standalone_test = True
    else:
        client_driver = driver

    coach_driver = None
    client_wait = None

    # ---------------------- Test code -----------------------
    printNotice(f"Running {Path(__file__).name}")
    try:
        if is_standalone_test:
            test_signup(client_driver)

        client_wait = WebDriverWait(client_driver, 10)

        print("Navigating to Find Coach page...")
        client_driver.get(f"{FRONTEND_URL}/find-coach")

        client_wait.until(EC.url_contains("/find-coach"))
        wait_for_page_to_fully_load(client_driver)

        client_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Find a Coach']")
            )
        )

        wait_for_coaches_to_load(client_driver, client_wait)

        print(f"Successfully navigated to: {client_driver.current_url}")

        print("Testing gender filter...")
        gender_select = Select(
            client_wait.until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//span[normalize-space()='Gender']/following-sibling::select[1]",
                    )
                )
            )
        )

        gender_select.select_by_value("female")
        wait_for_coaches_to_load(client_driver, client_wait)
        print("Filtered coaches by gender: female")

        print("Testing sort dropdown...")
        sort_select = Select(
            client_wait.until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//span[normalize-space()='Sort by']/following-sibling::select[1]",
                    )
                )
            )
        )

        sort_select.select_by_value("rating_count")
        wait_for_coaches_to_load(client_driver, client_wait)
        print("Sorted coaches by most reviewed")

        print("Testing View Profile...")
        view_profile_button = client_wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='View Profile']")
            )
        )
        ActionChains(client_driver).move_to_element(view_profile_button).perform()
        time.sleep(1)
        view_profile_button.click()

        client_wait.until(EC.url_contains("/coaches"))
        wait_for_page_to_fully_load(client_driver)
        client_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Coach Profile']")
            )
        )
        time.sleep(1)
        print(f"Successfully opened coach profile: {client_driver.current_url}")

        print("Scrolling through coach profile...")
        scroll(client_driver, "down", 0.01, 20)
        scroll(client_driver, "up", 0.01, 20)
        time.sleep(1)

        print("Going back to Find Coach page...")
        client_driver.back()

        client_wait.until(EC.url_contains("/find-coach"))
        wait_for_page_to_fully_load(client_driver)
        wait_for_coaches_to_load(client_driver, client_wait)

        print("Returned to Find Coach page successfully")
        time.sleep(1)

        print("Testing Request Coach for Wii Fit Trainer...")
        search_input = client_wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Search by coach name']")
            )
        )

        search_input.clear()
        search_input.send_keys("Wii Fit Trainer")

        time.sleep(1)
        wait_for_coaches_to_load(client_driver, client_wait)

        wii_fit_card = find_coach_card_by_name(
            client_driver, client_wait, "Wii Fit Trainer"
        )

        request_button = wii_fit_card.find_element(
            By.XPATH,
            ".//button[contains(normalize-space(), 'Request Coach') or contains(normalize-space(), 'Cancel Request')]"
        )

        request_button_text = request_button.text.strip()

        if "Request Coach" in request_button_text:
            request_button.click()

            client_wait.until(
                lambda current_driver: "Cancel Request" in wii_fit_card.text
                or "Sending..." not in wii_fit_card.text
            )

            assert "Cancel Request" in wii_fit_card.text, (
                "Expected Wii Fit Trainer card to show 'Cancel Request' after requesting coach."
            )

            print("Successfully requested Wii Fit Trainer as coach")
        else:
            print("Wii Fit Trainer was already requested")
        print("Requested coach.")
        time.sleep(1)

        print("Returning to client dashboard...")
        client_driver.get(f"{FRONTEND_URL}/client")

        client_wait.until(EC.url_contains("/client"))
        wait_for_page_to_fully_load(client_driver)

        coach_request_status_card = client_wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[normalize-space()='Coach Request Status']/ancestor::div[contains(@class, 'rounded-2xl')][1]",
                )
            )
        )

        ActionChains(client_driver).move_to_element(coach_request_status_card).perform()
        time.sleep(2)

        print("Coach Request Status is pending, waiting for response...")

        print("Opening coach browser to accept the request...")
        coach_driver = createDriver()
        coach_wait = WebDriverWait(coach_driver, 10)

        login_as_coach(
            coach_driver,
            WII_FIT_TRAINER_EMAIL,
            WII_FIT_TRAINER_PASSWORD,
        )

        accept_button = coach_wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Client Requests')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//button[@title='Accept']",
                )
            )
        )
        client_request_card = accept_button.find_element(
            By.XPATH,
            "./ancestor::div[contains(@class, 'flex') and .//button[@title='Accept']][1]",
        )
        ActionChains(coach_driver).move_to_element(client_request_card).perform()
        time.sleep(1)
        accept_button.click()

        my_clients_card = coach_wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'My Clients')]/ancestor::div[contains(@class, 'rounded-2xl')][1]",
                )
            )
        )
        coach_wait.until(EC.staleness_of(client_request_card))

        print("Coach accepted the client request successfully")

        ActionChains(coach_driver).move_to_element(my_clients_card).perform()
        time.sleep(2)

        coach_driver.quit()
        coach_driver = None
        print("Coach browser closed")

        print("Checking if request was accepted...")
        client_driver.refresh()

        wait_for_page_to_fully_load(client_driver)

        client_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//p[normalize-space()='Wii Fit Trainer']")
            )
        )
        time.sleep(2)

        assert "/client" in client_driver.current_url, (
            f"Expected to still be on '/client', got: {client_driver.current_url}"
        )

        printSuccess(f"No errors in {Path(__file__).name}: {client_driver.current_url} \n")
        return client_driver

    except Exception as e:
        printFailure(f"Test failed: {e}")
        raise

    finally:
        if coach_driver is not None:
            coach_driver.quit()
            print("Coach browser closed")

        # ----------- Quit driver for standalone tests -----------
        if is_standalone_test and not keep_driver:
            if client_wait is not None:
                fire_coach_button = client_wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, "//button[normalize-space()='End Relationship']")
                    )
                )
                fire_coach_button.click()
                relationship_alert = client_wait.until(EC.alert_is_present())
                time.sleep(1)

                relationship_alert.accept()
                time.sleep(2)

            delete_account(client_driver)
            client_driver.quit()
            print("Client browser closed \n")


if __name__ == "__main__":
    test_client_find_coach()
