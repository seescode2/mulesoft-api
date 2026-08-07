# Lab 4: Add future capacity and review the forecast

## Scenario

Northstar's platform lead takes the one-flow shortfall to procurement. Procurement can place an order for 10 more flow licenses effective April 2027. It also proposes five additional pre-production API Manager licenses for July, but that second request is not approved yet.

This lab shows why **ordered** and **planned** supply are treated differently and how the Monthly Forecast exposes timing gaps.

## Goal

Record future supply, inspect the January-to-December outlook, and review the committed forecast.

## 1. Add the ordered flow capacity

1. Click **Purchased Capacity** in the left navigation.
2. Click **+ Add purchase**.
3. Enter:
   - **License pool:** Flow licenses
   - **Quantity:** `10`
   - **Effective month:** April 2027
   - **Status:** ordered
   - **Description or notes:** `Approved fulfillment expansion`
4. Click **Save changes**.

Ordered capacity counts beginning in its effective month.

## 2. Record tentative capacity

1. Click **+ Add purchase**.
2. Enter:
   - **License pool:** API Manager pre-production
   - **Quantity:** `5`
   - **Effective month:** July 2027
   - **Status:** planned
   - **Description or notes:** `Tentative pre-production expansion`
3. Click **Save changes**.

The entry remains visible in the capacity list but does not count as purchased until its status becomes ordered or active.

## 3. Inspect the forecast

1. Set the reporting month to **January 2027**.
2. Click **Monthly Forecast**.
3. Read the **Flow licenses** cell for January, then April:
   - January should show `30 / 5 / 22 / 3` and **Covered**.
   - April should show `40 / 5 / 22 / 13` and **Covered**.
4. Notice that the July pre-production planned entry does not increase purchased capacity.

The compact values are purchased, used, reserved, and extra.

## 4. Review purchased capacity

On the Dashboard, confirm the planned July entry does not increase Purchased.
