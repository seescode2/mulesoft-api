# Lab 2: Introduce the Store Fulfillment project

## Scenario

The Digital Checkout plan has exposed a second dependency: stores and the website do not share a timely view of inventory. Northstar approves a separate **Store Fulfillment** project, led by a different team, to publish near-real-time inventory availability. Keeping it as a separate project gives leadership a clear reservation, owner, and delivery boundary.

This lab builds directly on Lab 1. Do not reset the workspace.

## Goal

Add a second project and its first API, then allocate only the capacity reserved for that project.

## 1. Confirm the lab month

1. In the reporting-month control at the top of the page, select **January 2027**.
2. Click **Projects** in the left navigation.
3. Confirm that **Digital Checkout** is present. If it is not, complete [Lab 1](lab1.md) first.

## 2. Create Store Fulfillment

1. On the Projects screen, click **+ Add project**.
2. Enter:
   - **Project name:** `Store Fulfillment`
   - **Effective month:** January 2027
   - **Description:** `Near-real-time store inventory and fulfillment services`
   - **Owner or contact:** `Luis Romero`
   - **Lifecycle:** active
   - **Reserved flows:** `10`
   - **Reserved pre-production:** `2`
   - **Reserved production:** `1`
3. Click **Save changes**.

## 3. Add the Inventory Availability API

1. Click **APIs** in the left navigation.
2. Click **+ Add API**.
3. Enter the general fields:
   - **API name:** `Inventory Availability API`
   - **Effective month:** January 2027
   - **Description:** `Publishes store-level available-to-promise inventory`
   - **Owning project:** Store Fulfillment
   - **Lifecycle:** in-development
   - **Shared base flow count:** `1`
4. In **DEV**, choose **used** for both **Flow state** and **API Manager**, and set **Replicas** to `1`.
5. In **TEST**, choose **reserved** for both **Flow state** and **API Manager**, and set **Replicas** to `2`.
6. In **PROD**, choose **reserved** for both **Flow state** and **API Manager**, and set **Replicas** to `2`.
7. Leave all three **Flow override** fields empty.
8. Click **Save changes**.

The API's total flow demand is 5: `1 DEV + 2 TEST + 2 PROD`.

## 4. Allocate Store Fulfillment's reservation

1. Find **Inventory Availability API** in the APIs table.
2. Click **Allocate** in its row.
3. Confirm these **New allocation** values:
   - **Flow licenses:** `5`
   - **API Manager pre-production:** `2`
   - **API Manager production:** `1`
4. Click **Confirm allocation**.

## Check your work

1. Click **Projects**.
2. Confirm that Store Fulfillment shows 10 reserved flows, 5 allocated, 5 unassigned, and no overrun.
3. Confirm that Digital Checkout remains unchanged at 14 reserved and 12 allocated flows.
4. Click **Dashboard**. All pools should remain covered, but flow headroom should be much smaller than it was in Lab 1.

The portfolio now has two independently governed projects. Continue with [Lab 3](lab3.md).
