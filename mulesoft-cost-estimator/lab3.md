# Lab 3: Find and respond to a project overrun

## Scenario

Store Fulfillment's team learns that publishing inventory is not enough. It must also orchestrate store pickup, shipment routing, and exception handling. The proposed **Fulfillment Orchestration API** needs more flow capacity than the project has left.

This lab deliberately creates an overrun. You will use the warnings to distinguish API demand, automatic reservation coverage, project reservation, and organization capacity.

## Goal

Add the new API, observe its uncovered demand, then expand the Store Fulfillment reservation and review the remaining extra capacity.

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

This warning is visible even before the new API is covered; creating API demand does not silently enlarge a project reservation.

## 3. Review the uncovered demand

The planner automatically uses the remaining project reservation. The API still has uncovered demand until the reservation is increased.

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

## 5. Verify recalculated coverage

Saving the larger project reservation automatically covers the remaining API demand.

On the Dashboard, Flow licenses should show `30 Purchased = 5 Used + 22 Reserved + 3 Extra`.
