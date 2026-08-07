# Lab 1: Plan a new Digital Checkout project

## Scenario

Northstar Outfitters is a regional outdoor retailer whose online checkout still sends orders to the warehouse through nightly files. During holiday peaks, customers sometimes buy items that are no longer available, and support staff must cancel those orders manually.

The company has approved a **Digital Checkout** project. Its first MuleSoft API, **Checkout Experience API**, will validate checkout requests now and later support web and mobile channels. Development begins in January 2027. The team expects one DEV replica, two TEST replicas, and three PROD replicas. DEV work has started; TEST and PROD capacity is reserved for later phases.

In this lab you will start with a clean workspace, record the organization's existing licenses and strategic reserve, create one learner project, add its first API; its reservation is applied automatically to that API.

> The planner always retains its protected **Shared Platform / Unassigned** project. “One project” in this lab means one project created by you.

## Goal

Create the January 2027 plan for Digital Checkout and confirm that the API's demand is covered by its project reservation.

## 1. Start with a clean January workspace

1. Open `index.html` in a current desktop browser.
2. In the left navigation, click **Import / Export**.
3. Under **Reset local workspace**, click **Reset all data**.
4. In the confirmation prompt, type `RESET`, then click **OK**.
5. In the reporting-month control at the top of the page, select **January 2027** (`2027-01`).

Do not click **Load sample data**; these labs create their own scenario.

## 2. Record the licenses Northstar already owns

1. In the left navigation, click **License Capacity**.
2. Click **+ Add capacity**.
3. Enter:
   - **License pool:** Flow licenses
   - **Quantity:** `30`
   - **Effective month:** January 2027
   - **Status:** active
   - **Description or notes:** `Northstar base subscription`
4. Click **Save changes**.
5. Click **+ Add capacity** again and enter:
   - **License pool:** API Manager pre-production
   - **Quantity:** `8`
   - **Effective month:** January 2027
   - **Status:** active
   - **Description or notes:** `DEV and TEST entitlement`
6. Click **Save changes**.
7. Click **+ Add capacity** once more and enter:
   - **License pool:** API Manager production
   - **Quantity:** `4`
   - **Effective month:** January 2027
   - **Status:** active
   - **Description or notes:** `Production entitlement`
8. Click **Save changes**.

## 3. Protect a strategic reserve

Northstar's architecture team keeps capacity aside for incidents and small unplanned integrations.

1. In the left navigation, click **Strategic Reserve**.
2. Click **Change reserve**.
3. Set **Effective month** to January 2027.
4. Enter:
   - **Flow licenses:** `4`
   - **API Manager pre-production:** `1`
   - **API Manager production:** `1`
5. Click **Save changes**.

## 4. Create the Digital Checkout project

1. In the left navigation, click **Projects**.
2. Click **+ Add project**.
3. Enter:
   - **Project name:** `Digital Checkout`
   - **Effective month:** January 2027
   - **Description:** `Real-time checkout modernization for web and mobile sales`
   - **Owner or contact:** `Maya Patel`
   - **Lifecycle:** active
   - **Reserved flows:** `14`
   - **Reserved pre-production:** `2`
   - **Reserved production:** `1`
4. Click **Save changes**.

The Projects table should show Digital Checkout with 14 reserved flows and no covered flows yet.

## 5. Add the Checkout Experience API

1. In the left navigation, click **APIs**.
2. Click **+ Add API**.
3. Enter the general fields:
   - **API name:** `Checkout Experience API`
   - **Effective month:** January 2027
   - **Description:** `Validates checkout requests and coordinates the purchase experience`
   - **Owning project:** Digital Checkout
   - **Lifecycle:** in-development
   - **Shared base flow count:** `2`
4. In **DEV**, set:
   - **Flow state:** used
   - **API Manager:** used
   - **Replicas:** `1`
   - Leave **Flow override** empty.
5. In **TEST**, set:
   - **Flow state:** reserved
   - **API Manager:** reserved
   - **Replicas:** `2`
   - Leave **Flow override** empty.
6. In **PROD**, set:
   - **Flow state:** reserved
   - **API Manager:** reserved
   - **Replicas:** `3`
   - Leave **Flow override** empty.
7. Click **Save changes**.

The API uses 2 DEV flows and reserves 10 more: `(2 × 2 TEST replicas) + (2 × 3 PROD replicas)`. It also needs two pre-production API Manager licenses and one production license.

## 6. Verify automatic coverage

1. Return to **Projects**.
2. Confirm that the API demand is covered automatically from Digital Checkout’s reservation. No separate action is required.
