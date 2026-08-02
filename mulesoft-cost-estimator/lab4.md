# Lab 4: Add future capacity and compare forecast modes

## Scenario

Northstar's platform lead takes the one-flow shortfall to procurement. Procurement can place an order for 10 more flow licenses effective April 2027. It also proposes five additional pre-production API Manager licenses for July, but that second request is not approved yet.

This lab shows why **ordered** and **planned** supply are treated differently and how the Monthly Forecast exposes timing gaps.

## Goal

Record future supply, inspect the January-to-December outlook, and compare committed and planning modes.

## 1. Add the ordered flow capacity

1. Keep the top forecast mode set to **Committed**.
2. Click **License Capacity** in the left navigation.
3. Click **+ Add capacity**.
4. Enter:
   - **License pool:** Flow licenses
   - **Quantity:** `10`
   - **Effective month:** April 2027
   - **Status:** ordered
   - **Description or notes:** `Approved fulfillment expansion`
5. Click **Save changes**.

Ordered capacity counts in both forecast modes beginning in its effective month.

## 2. Add the tentative pre-production capacity

1. Click **+ Add capacity**.
2. Enter:
   - **License pool:** API Manager pre-production
   - **Quantity:** `5`
   - **Effective month:** July 2027
   - **Status:** planned
   - **Description or notes:** `Unapproved second-half growth option`
3. Click **Save changes**.

Planned capacity appears as uncertain. It counts as owned only in Planning mode.

## 3. Inspect the committed forecast

1. Set the reporting month to **January 2027**.
2. Confirm that **Committed** is selected in the top-right mode switch.
3. Click **Monthly Forecast**.
4. Read the **Flow licenses** cell for January, then April:
   - January should show `30 / 27 / -1` and **Shortfall**.
   - April should show `40 / 27 / 9` and **Covered**.
5. Notice that the July pre-production planned entry does not increase committed owned capacity.

The forecast's free value also subtracts strategic reserve, even though the compact cell displays only owned, demand, and free.

## 4. Compare Planning mode

1. At the top right, click **Planning**.
2. Stay on **Monthly Forecast**.
3. Find July 2027. API Manager pre-production owned capacity should increase from 8 to 13 because the planned entry is included.
4. Click **Dashboard** and review the **Uncertain** value on the API Manager pre-production card.
5. Click **Committed** to return to the approved-supply view.

## Check your work

1. Click **License Capacity** and confirm that the April flow entry says **Yes** in both **Committed** and **Planning**.
2. Confirm that the July pre-production entry shows **No** under **Committed** and **Yes** under **Planning**.
3. Return to **Monthly Forecast** in Committed mode. The flow shortfall should exist from January through March and be covered from April onward.

Continue with [Lab 5](lab5.md) to record the April launch and preserve the completed plan.
