# Lab 3: Find and respond to a project overrun

## Scenario

Store Fulfillment's team learns that publishing inventory is not enough. It must also orchestrate store pickup, shipment routing, and exception handling. The proposed **Fulfillment Orchestration API** needs more flow capacity than the project has left.

This lab deliberately creates an overrun. You will use the warnings to distinguish API demand, API allocation, project reservation, and organization capacity.

## Goal

Add the new API, observe its uncovered demand, then expand the Store Fulfillment reservation and see the resulting organization shortfall.

## 1. Add the Fulfillment Orchestration API

1. Keep the reporting month at **January 2027**.
2. Click **APIs** in the left navigation.
3. Click **+ Add API**.
4. Enter the general fields:
   - **API name:** `Fulfillment Orchestration API`
   - **Effective month:** January 2027
   - **Description:** `Routes pickup and shipment work across stores and distribution centers`
   - **Owning project:** Store Fulfillment
   - **Lifecycle:** planned
   - **Shared base flow count:** `2`
5. In **DEV**, select **used** for both states and set **Replicas** to `1`.
6. In **TEST**, select **reserved** for both states and set **Replicas** to `1`.
7. In **PROD**, select **reserved** for both states and set **Replicas** to `2`.
8. Leave all **Flow override** fields empty and click **Save changes**.

The new API demands 8 flows: `2 DEV + 2 TEST + 4 PROD`.

## 2. See the project overrun

1. Click **Projects**.
2. Find **Store Fulfillment**.
3. Its APIs now demand 13 flows in total, but the project reserves only 10. They also exceed the API Manager reservation by 2 pre-production licenses and 1 production license. The **Overrun** column sums the pool overruns, so it should display a warning totaling `6` (`3 + 2 + 1`).

This warning is visible even before the new API is allocated; creating API demand does not silently enlarge a project reservation.

## 3. Allocate only what remains

1. Click **APIs**.
2. In the Fulfillment Orchestration API row, click **Allocate**.
3. Review the table. The suggested additional flow allocation is `5`, because that is all of Store Fulfillment's unassigned flow reservation.
4. Set or retain these **New allocation** values:
   - **Flow licenses:** `5`
   - **API Manager pre-production:** `0`
   - **API Manager production:** `0`
5. Click **Confirm allocation**.

The API still has 3 uncovered flows and uncovered API Manager demand. Partial allocation records the decision without pretending that the project reservation is larger.

## 4. Expand the project reservation

The steering group approves the project's full requirement, even though organization supply has not yet been increased.

1. Click **Projects**.
2. In the Store Fulfillment row, click **Edit**.
3. Keep **Effective month** at January 2027.
4. Change:
   - **Reserved flows:** from `10` to `13`
   - **Reserved pre-production:** from `2` to `4`
   - **Reserved production:** from `1` to `2`
5. Leave the other fields unchanged and click **Save changes**.
6. If a **Save this change?** advisory appears, review it and click **Save anyway**.

## 5. Finish the API allocation

1. Click **APIs**.
2. In the Fulfillment Orchestration API row, click **Allocate**.
3. Set **New allocation** to:
   - **Flow licenses:** `8`
   - **API Manager pre-production:** `2`
   - **API Manager production:** `1`
4. Click **Confirm allocation**.

## Check your work

1. Click **Projects**. Store Fulfillment should show 13 reserved flows, 13 allocated, 0 unassigned, and no overrun.
2. Click **APIs**. Both Store Fulfillment APIs should have a check mark in **Warnings**.
3. Click **Dashboard**. **Flow licenses** should report a shortfall of 1: 30 owned minus 27 project/API demand minus 4 protected reserve.

You resolved the project-level overrun but exposed an organization-level supply gap. Continue with [Lab 4](lab4.md).
