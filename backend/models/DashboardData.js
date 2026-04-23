import mongoose from "mongoose";

const { Schema } = mongoose;

// Schema aligned with the cleaned dataset.
// strict:false allows additional columns without breaking inserts.
const dashboardDataSchema = new mongoose.Schema(
  {
    Record_No: Schema.Types.Mixed,
    Day: Schema.Types.Mixed,
    Planned_Date: Schema.Types.Mixed,
    Arrival_Date: Schema.Types.Mixed,
    Arrival_Time: Schema.Types.Mixed,
    Plate_No: Schema.Types.Mixed,
    Vehicle_Type: Schema.Types.Mixed,
    Supplier: Schema.Types.Mixed,
    Origin: Schema.Types.Mixed,
    N_Pallets: Schema.Types.Mixed,
    Position: Schema.Types.Mixed,
    Unloaded_Date: Schema.Types.Mixed,
    Unloaded_Time: Schema.Types.Mixed,
    Waiting_Days: Schema.Types.Mixed,
  },
  {
    strict: false,
    timestamps: true,
  },
);

const DashboardData = mongoose.model("DashboardData", dashboardDataSchema);

export default DashboardData;
