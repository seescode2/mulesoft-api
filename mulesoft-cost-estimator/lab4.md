# Lab 4: Add future capacity and review supply

## Scenario

Northstar's platform lead takes the one-flow shortfall to procurement. Procurement can place an order for 10 more flow licenses effective April 2027. It also proposes five additional pre-production API Manager licenses for July, but that second request is not approved yet.

This lab shows why **active** and **planned** supply are treated differently across reporting months.

## Goal

Record future supply and inspect how it affects purchased capacity in different reporting months.

## 1. Add the active flow capacity

1. Click **Purchased Capacity** in the left navigation.
2. Click **+ Add purchase**.
3. Enter:
   - **License pool:** Flow licenses
   - **Quantity:** `10`
   - **Effective month:** April 2027
   - **Status:** active
   - **Description or notes:** `Approved fulfillment expansion`
4. Click **Save changes**.

Active capacity counts as purchased beginning in its effective month.

## 2. Record tentative capacity

1. Click **+ Add purchase**.
2. Enter:
   - **License pool:** API Manager pre-production
   - **Quantity:** `5`
   - **Effective month:** July 2027
   - **Status:** planned
   - **Description or notes:** `Tentative pre-production expansion`
3. Click **Save changes**.

The entry remains visible in the capacity list but does not count as purchased until its status becomes active.

## 3. Inspect capacity by reporting month

1. Set the reporting month to **January 2027**.
2. Click **Dashboard**.
3. In the **Flow licenses** card, January should show `30` purchased and `3` extra.
4. Set the reporting month to **April 2027**. The card should show `40` purchased and `13` extra.
5. Set the reporting month to **July 2027**. Notice that the planned pre-production entry does not increase purchased capacity.

## 4. Review purchased capacity

On the Dashboard, confirm the planned July entry does not increase Purchased.
