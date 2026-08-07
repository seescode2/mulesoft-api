# Lab 5: Record go-live and export the plan

## Scenario

It is April 2027. The extra flow licenses are effective, Digital Checkout has passed production readiness, and its reserved TEST and PROD environments are now running. Leadership wants an auditable snapshot of the plan after go-live.

Because planner changes are effective-dated, the January plan remains intact while April receives a new configuration.

## Goal

Record Digital Checkout's go-live, verify that classification changes do not duplicate demand, and export the complete dataset.

## 1. Move to the go-live month

1. In the reporting-month control, select **April 2027**.
2. The workspace automatically uses the committed forecast.
3. Click **Dashboard** and verify that the active flow capacity is now included.

## 2. Record the API as operational

1. Click **APIs** in the left navigation.
2. Find **Checkout Experience API** and click **Edit**.
3. Confirm **Effective month** is April 2027.
4. Change **Lifecycle** from **in-development** to **operational**.
5. Leave DEV as **used / used** with 1 replica.
6. In TEST, change **Flow state** from **reserved** to **used** and **API Manager** from **reserved** to **used**. Keep 2 replicas.
7. In PROD, change **Flow state** from **reserved** to **used** and **API Manager** from **reserved** to **used**. Keep 3 replicas.
8. Leave the base flow count and overrides unchanged.
9. Click **Save changes**.
10. The planner will explain that reserved-to-used changes classification without increasing coverage. Click **Save anyway**.

## 3. Verify January history and April state

1. On the APIs screen, confirm that Checkout Experience API is **Operational** and now shows 12 used flows and 0 reserved flows.
2. Change the reporting month back to **January 2027**.
3. Confirm that the same API is still **In Development**, with 2 used and 10 reserved flows.
4. Change the reporting month to **April 2027** again.
5. Click **Projects** and confirm that Digital Checkout still has 12 covered flows. A classification change did not consume the reservation twice.

## 4. Export the completed scenario

1. Click **Import / Export** in the left navigation.
2. Under **Export complete dataset**, click **Export JSON**.
3. Save the downloaded `mulesoft-capacity-2027-04.json` file in the location your browser offers.

The export contains capacity entries, projects, APIs, coverages, and every effective-dated January and April value. It can be validated and restored later through **Choose JSON file**.

## Final review

Your scenario should now contain:

- Two learner-created projects: Digital Checkout and Store Fulfillment
- Three APIs: Checkout Experience, Inventory Availability, and Fulfillment Orchestration
- Base capacity effective January 2027
- Active flow capacity effective April 2027
- Planned pre-production capacity effective July 2027
- Preserved before-and-after history for the Digital Checkout launch

You have taken a capacity plan from a single proposed project through portfolio growth, constraint discovery, procurement, go-live, and export.
