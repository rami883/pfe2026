import express from 'express'
import DashboardData from '../models/DashboardData.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
const ALLOWED_ROLES = new Set(['admin', 'directeur'])
const RECEPTION_WRITE_ROLES = new Set(['admin', 'gestionnaire'])

function requireDashboardAccess(req, res, next) {
  if (!req.user || !ALLOWED_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }

  return next()
}

function requireReceptionWriteAccess(req, res, next) {
  if (!req.user || !RECEPTION_WRITE_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }

  return next()
}

function parseDaysQuery(daysRaw) {
  const parsed = Number(daysRaw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 365
  }

  return Math.min(Math.floor(parsed), 3650)
}

function normalizeTransportType(valueRaw) {
  const value = String(valueRaw || '').trim().toLowerCase()
  if (value === 'truck') {
    return 'Truck'
  }

  if (value === 'van') {
    return 'Van'
  }

  return ''
}

function normalizeOrigin(valueRaw) {
  const value = String(valueRaw || '').trim().toLowerCase()
  if (value === 'local') {
    return 'Local'
  }

  if (value === 'euro' || value === 'eurol') {
    return 'Euro'
  }

  return ''
}

function parsePalletCount(valueRaw) {
  const parsed = Number(valueRaw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function deriveDayFromDate(dateRaw) {
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function parseDateQuery(dateRaw, { endOfDay = false } = {}) {
  if (!dateRaw) {
    return null
  }

  const parsed = new Date(dateRaw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }

  return parsed
}

function normalizeSupplierQueryList(suppliersRaw) {
  if (!suppliersRaw) {
    return []
  }

  const values = Array.isArray(suppliersRaw)
    ? suppliersRaw
    : String(suppliersRaw).split(',')

  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))]
}

function normalizeSingleQuery(valueRaw) {
  const value = String(valueRaw || '').trim()
  if (!value || value.toLowerCase() === 'all') {
    return ''
  }

  return value.toLowerCase()
}

function parseDashboardFilters(query) {
  const days = parseDaysQuery(query.days)
  const fromDate = parseDateQuery(query.fromDate)
  const toDate = parseDateQuery(query.toDate, { endOfDay: true })
  const suppliers = normalizeSupplierQueryList(query.suppliers)
  const origin = normalizeSingleQuery(query.origin)
  const vehicleType = normalizeSingleQuery(query.vehicleType)

  return {
    days,
    fromDate,
    toDate,
    suppliers,
    origin,
    vehicleType,
  }
}

function buildDateMatch(filters) {
  if (filters.fromDate || filters.toDate) {
    const dateMatch = {}
    if (filters.fromDate) {
      dateMatch.$gte = filters.fromDate
    }
    if (filters.toDate) {
      dateMatch.$lte = filters.toDate
    }
    return dateMatch
  }

  const sinceDate = new Date()
  sinceDate.setHours(0, 0, 0, 0)
  sinceDate.setDate(sinceDate.getDate() - filters.days)
  return { $gte: sinceDate }
}

function getBaseAddFieldsStage() {
  return {
    $addFields: {
      supplierNormalized: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Supplier', ''] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      supplierNormalizedLower: {
        $toLower: {
          $trim: {
            input: {
              $convert: {
                input: { $ifNull: ['$Supplier', ''] },
                to: 'string',
                onError: '',
                onNull: '',
              },
            },
          },
        },
      },
      trailerNormalized: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Record_No', '$Plate_No'] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      originNormalized: {
        $let: {
          vars: {
            originRawLower: {
              $toLower: {
                $trim: {
                  input: {
                    $convert: {
                      input: { $ifNull: ['$Origin', ''] },
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                },
              },
            },
          },
          in: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$$originRawLower', ['euro', 'eurol']] },
                  then: 'Euro',
                },
                {
                  case: { $eq: ['$$originRawLower', 'local'] },
                  then: 'Local',
                },
              ],
              default: '',
            },
          },
        },
      },
      originNormalizedLower: {
        $let: {
          vars: {
            originRawLower: {
              $toLower: {
                $trim: {
                  input: {
                    $convert: {
                      input: { $ifNull: ['$Origin', ''] },
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                },
              },
            },
          },
          in: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$$originRawLower', ['euro', 'eurol']] },
                  then: 'euro',
                },
                {
                  case: { $eq: ['$$originRawLower', 'local'] },
                  then: 'local',
                },
              ],
              default: '',
            },
          },
        },
      },
      vehicleTypeNormalized: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Vehicle_Type', ''] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      vehicleTypeNormalizedLower: {
        $toLower: {
          $trim: {
            input: {
              $convert: {
                input: { $ifNull: ['$Vehicle_Type', ''] },
                to: 'string',
                onError: '',
                onNull: '',
              },
            },
          },
        },
      },
      palletsNumeric: {
        $convert: {
          input: { $ifNull: ['$N_Pallets', 0] },
          to: 'double',
          onError: 0,
          onNull: 0,
        },
      },
      waitingDaysNumeric: {
        $convert: {
          input: { $ifNull: ['$Waiting_Days', null] },
          to: 'double',
          onError: null,
          onNull: null,
        },
      },
      arrivalDateNormalized: {
        $convert: {
          input: { $ifNull: ['$Arrival_Date', null] },
          to: 'date',
          onError: null,
          onNull: null,
        },
      },
      arrivalTimeString: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ['$Arrival_Time', ''] },
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
        },
      },
      arrivalTimeAsDate: {
        $convert: {
          input: { $ifNull: ['$Arrival_Time', null] },
          to: 'date',
          onError: null,
          onNull: null,
        },
      },
    },
  }
}

function getArrivalHourStage() {
  return {
    $addFields: {
      arrivalHour: {
        $ifNull: [
          {
            $cond: [
              { $ne: ['$arrivalTimeAsDate', null] },
              { $hour: '$arrivalTimeAsDate' },
              null,
            ],
          },
          {
            $let: {
              vars: {
                hourMatch: {
                  $regexFind: {
                    input: '$arrivalTimeString',
                    regex: /^\s*(\d{1,2})/,
                  },
                },
              },
              in: {
                $cond: [
                  { $ne: ['$$hourMatch', null] },
                  { $toInt: '$$hourMatch.match' },
                  null,
                ],
              },
            },
          },
        ],
      },
    },
  }
}

function buildBaseMatch(filters, options = {}) {
  const {
    ignoreSupplier = false,
    ignoreOrigin = false,
    ignoreVehicleType = false,
  } = options
  const match = {
    arrivalDateNormalized: buildDateMatch(filters),
  }

  if (!ignoreSupplier && filters.suppliers.length) {
    match.supplierNormalizedLower = { $in: filters.suppliers }
  }

  if (!ignoreOrigin && filters.origin) {
    match.originNormalizedLower = filters.origin
  }

  if (!ignoreVehicleType && filters.vehicleType) {
    match.vehicleTypeNormalizedLower = filters.vehicleType
  }

  return match
}

function weekLabelProjection(idPath) {
  return {
    $concat: [
      { $toString: `${idPath}.year` },
      '-W',
      {
        $cond: [
          { $lt: [`${idPath}.week`, 10] },
          { $concat: ['0', { $toString: `${idPath}.week` }] },
          { $toString: `${idPath}.week` },
        ],
      },
    ],
  }
}

router.get('/suppliers/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
        }),
      },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$supplierNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard supplier options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.post('/receptions', protect, requireReceptionWriteAccess, async (req, res) => {
  try {
    const arrivalDate = String(req.body.arrivalDate || '').trim()
    const arrivalTime = String(req.body.arrivalTime || '').trim()
    const trailerPlate = String(req.body.trailerPlate || '').trim()
    const supplier = String(req.body.supplier || '').trim()
    const position = String(req.body.position || '').trim()
    const transportType = normalizeTransportType(req.body.transportType)
    const origin = normalizeOrigin(req.body.origin)
    const palletsCount = parsePalletCount(req.body.palletsCount)

    if (
      !arrivalDate ||
      !arrivalTime ||
      !trailerPlate ||
      !supplier ||
      !position ||
      !transportType ||
      !origin ||
      palletsCount === null
    ) {
      return res
        .status(400)
        .json({ message: 'Veuillez completer correctement tous les champs obligatoires.' })
    }

    const created = await DashboardData.create({
      Record_No: trailerPlate,
      Day: deriveDayFromDate(arrivalDate),
      Planned_Date: arrivalDate,
      Arrival_Date: arrivalDate,
      Arrival_Time: arrivalTime,
      Plate_No: trailerPlate,
      Vehicle_Type: transportType,
      Supplier: supplier,
      Origin: origin,
      N_Pallets: palletsCount,
      Position: position,
      Unloaded_Date: null,
      Unloaded_Time: null,
      Waiting_Days: 0,
      Created_By_Email: req.user?.email || '',
      Created_By_Id: String(req.user?._id || ''),
    })

    return res.status(201).json({
      message: 'Reception enregistree avec succes.',
      reception: {
        id: String(created._id),
        createdAt: created.createdAt,
        supplier: created.Supplier,
        origin: created.Origin,
        vehicleType: created.Vehicle_Type,
        pallets: created.N_Pallets,
        recordNo: created.Record_No,
        arrivalDate: created.Arrival_Date,
        arrivalTime: created.Arrival_Time,
      },
    })
  } catch (error) {
    console.error('Create reception error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/alerts/receptions', protect, requireDashboardAccess, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
      : 30

    const rows = await DashboardData.find({
      Created_By_Id: { $exists: true, $nin: ['', null] },
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select(
        '_id createdAt Supplier Origin Vehicle_Type N_Pallets Record_No Plate_No Arrival_Date Arrival_Time',
      )
      .lean()

    const alerts = rows.map((row) => ({
      id: String(row._id),
      createdAt: row.createdAt,
      supplier: String(row.Supplier || '').trim(),
      origin: normalizeOrigin(row.Origin) || String(row.Origin || '').trim(),
      vehicleType:
        normalizeTransportType(row.Vehicle_Type) || String(row.Vehicle_Type || '').trim(),
      pallets: Number(row.N_Pallets) || 0,
      recordNo: String(row.Record_No || row.Plate_No || '').trim(),
      arrivalDate: String(row.Arrival_Date || '').trim(),
      arrivalTime: String(row.Arrival_Time || '').trim(),
    }))

    return res.status(200).json(alerts)
  } catch (error) {
    console.error('Reception alerts error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/origins/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
          ignoreOrigin: true,
        }),
      },
      { $match: { originNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$originNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard origin options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/vehicle-types/options', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      {
        $match: buildBaseMatch(filters, {
          ignoreSupplier: true,
          ignoreVehicleType: true,
        }),
      },
      { $match: { vehicleTypeNormalized: { $nin: ['', null] } } },
      { $group: { _id: '$vehicleTypeNormalized' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: '$_id' } },
    ])

    return res.status(200).json(rows.map((item) => item.label))
  } catch (error) {
    console.error('Dashboard vehicle type options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/executive', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const baseMatch = buildBaseMatch(filters)

    const [kpiResult, topSupplierResult, trailersByWeekResult, palletsPerTrailerByWeekResult] =
      await Promise.all([
        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              totalPallets: { $sum: '$palletsNumeric' },
              waitingDaysTotal: { $sum: { $ifNull: ['$waitingDaysNumeric', 0] } },
              waitingDaysCount: {
                $sum: {
                  $cond: [{ $ne: ['$waitingDaysNumeric', null] }, 1, 0],
                },
              },
              onTimeCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$waitingDaysNumeric', null] },
                        { $lte: ['$waitingDaysNumeric', 1] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              delayedCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$waitingDaysNumeric', null] },
                        { $gt: ['$waitingDaysNumeric', 2] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              trailersSet: { $addToSet: '$trailerNormalized' },
            },
          },
          {
            $project: {
              _id: 0,
              totalPallets: { $round: ['$totalPallets', 2] },
              totalTrailers: {
                $size: {
                  $setDifference: ['$trailersSet', ['', null]],
                },
              },
              averageWaitingDays: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $divide: ['$waitingDaysTotal', '$waitingDaysCount'] },
                      0,
                    ],
                  },
                  2,
                ],
              },
              onTimeUnloadingRate: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $multiply: [{ $divide: ['$onTimeCount', '$waitingDaysCount'] }, 100] },
                      0,
                    ],
                  },
                  2,
                ],
              },
              delayRate: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$waitingDaysCount', 0] },
                      { $multiply: [{ $divide: ['$delayedCount', '$waitingDaysCount'] }, 100] },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
          {
            $addFields: {
              palletsPerTrailer: {
                $round: [
                  {
                    $cond: [
                      { $gt: ['$totalTrailers', 0] },
                      { $divide: ['$totalPallets', '$totalTrailers'] },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          { $match: { supplierNormalized: { $nin: ['', null] } } },
          {
            $group: {
              _id: '$supplierNormalized',
              totalPallets: { $sum: '$palletsNumeric' },
            },
          },
          { $sort: { totalPallets: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              supplier: '$_id',
              totalPallets: { $round: ['$totalPallets', 2] },
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: {
                year: { $isoWeekYear: '$arrivalDateNormalized' },
                week: { $isoWeek: '$arrivalDateNormalized' },
              },
              trailersSet: { $addToSet: '$trailerNormalized' },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              _id: 0,
              week: weekLabelProjection('$_id'),
              trailers: {
                $size: {
                  $setDifference: ['$trailersSet', ['', null]],
                },
              },
            },
          },
        ]),

        DashboardData.aggregate([
          getBaseAddFieldsStage(),
          { $match: baseMatch },
          {
            $group: {
              _id: {
                year: { $isoWeekYear: '$arrivalDateNormalized' },
                week: { $isoWeek: '$arrivalDateNormalized' },
              },
              totalPallets: { $sum: '$palletsNumeric' },
              trailersSet: { $addToSet: '$trailerNormalized' },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
          {
            $project: {
              _id: 0,
              week: weekLabelProjection('$_id'),
              palletsPerTrailer: {
                $round: [
                  {
                    $cond: [
                      {
                        $gt: [
                          {
                            $size: {
                              $setDifference: ['$trailersSet', ['', null]],
                            },
                          },
                          0,
                        ],
                      },
                      {
                        $divide: [
                          '$totalPallets',
                          {
                            $size: {
                              $setDifference: ['$trailersSet', ['', null]],
                            },
                          },
                        ],
                      },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        ]),
      ])

    const topSupplier = topSupplierResult[0] || { supplier: '-', totalPallets: 0 }
    const kpis = {
      ...(kpiResult[0] || {
        totalPallets: 0,
        totalTrailers: 0,
        palletsPerTrailer: 0,
        averageWaitingDays: 0,
        onTimeUnloadingRate: 0,
        delayRate: 0,
      }),
      topSupplier: topSupplier.supplier,
      topSupplierPallets: topSupplier.totalPallets,
    }

    return res.status(200).json({
      kpis,
      trailersByWeek: trailersByWeekResult,
      palletsPerTrailerByWeek: palletsPerTrailerByWeekResult,
    })
  } catch (error) {
    console.error('Dashboard executive error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/suppliers/performance', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const groupedSuppliers = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      { $match: buildBaseMatch(filters) },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$supplierNormalized',
          totalPallets: { $sum: '$palletsNumeric' },
          trailersSet: { $addToSet: '$trailerNormalized' },
          records: { $sum: 1 },
          waitingDaysTotal: { $sum: { $ifNull: ['$waitingDaysNumeric', 0] } },
          waitingDaysCount: {
            $sum: {
              $cond: [{ $ne: ['$waitingDaysNumeric', null] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          supplier: '$_id',
          totalPallets: { $round: ['$totalPallets', 2] },
          totalTrailers: {
            $size: {
              $setDifference: ['$trailersSet', ['', null]],
            },
          },
          records: 1,
          averageWaitingDays: {
            $round: [
              {
                $cond: [
                  { $gt: ['$waitingDaysCount', 0] },
                  { $divide: ['$waitingDaysTotal', '$waitingDaysCount'] },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          avgPalletsPerTrailer: {
            $round: [
              {
                $cond: [
                  { $gt: ['$totalTrailers', 0] },
                  { $divide: ['$totalPallets', '$totalTrailers'] },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalPallets: -1, supplier: 1 } },
    ])

    const byPallets = [...groupedSuppliers]
      .sort((a, b) => b.totalPallets - a.totalPallets)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.totalPallets,
        records: item.records,
      }))

    const byTrailers = [...groupedSuppliers]
      .sort((a, b) => b.totalTrailers - a.totalTrailers)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.totalTrailers,
        records: item.records,
      }))

    const byEfficiency = [...groupedSuppliers]
      .sort((a, b) => b.avgPalletsPerTrailer - a.avgPalletsPerTrailer)
      .slice(0, 10)
      .map((item) => ({
        supplier: item.supplier,
        value: item.avgPalletsPerTrailer,
        records: item.records,
      }))

    const avgSupplierEfficiency = groupedSuppliers.length
      ? groupedSuppliers.reduce((total, item) => total + item.avgPalletsPerTrailer, 0) /
        groupedSuppliers.length
      : 0

    return res.status(200).json({
      summary: {
        totalSuppliers: groupedSuppliers.length,
        topSupplier: byPallets[0]?.supplier || '-',
        avgSupplierEfficiency: Number(avgSupplierEfficiency.toFixed(2)),
      },
      suppliers: groupedSuppliers,
      topSuppliersByPallets: byPallets,
      topSuppliersByTrailers: byTrailers,
      topSuppliersByAvgPalletsPerTrailer: byEfficiency,
    })
  } catch (error) {
    console.error('Dashboard suppliers performance error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/operations', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const baseMatch = buildBaseMatch(filters)

    const [
      receptionsByDay,
      receptionsByWeek,
      arrivalsByHour,
      vehicleTypeDistribution,
      originDistribution,
      recentShipments,
    ] = await Promise.all([
      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$arrivalDateNormalized',
                },
              },
            },
            trailersSet: { $addToSet: '$trailerNormalized' },
          },
        },
        { $sort: { '_id.day': 1 } },
        {
          $project: {
            _id: 0,
            day: '$_id.day',
            count: {
              $size: {
                $setDifference: ['$trailersSet', ['', null]],
              },
            },
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        {
          $group: {
            _id: {
              year: { $isoWeekYear: '$arrivalDateNormalized' },
              week: { $isoWeek: '$arrivalDateNormalized' },
            },
            trailersSet: { $addToSet: '$trailerNormalized' },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            week: weekLabelProjection('$_id'),
            count: {
              $size: {
                $setDifference: ['$trailersSet', ['', null]],
              },
            },
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        getArrivalHourStage(),
        { $match: baseMatch },
        { $match: { arrivalHour: { $ne: null, $gte: 0, $lte: 23 } } },
        {
          $group: {
            _id: '$arrivalHour',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            hour: {
              $concat: [
                {
                  $cond: [
                    { $lt: ['$_id', 10] },
                    { $concat: ['0', { $toString: '$_id' }] },
                    { $toString: '$_id' },
                  ],
                },
                ':00',
              ],
            },
            count: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $match: { vehicleTypeNormalized: { $nin: ['', null] } } },
        {
          $group: {
            _id: '$vehicleTypeNormalized',
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
        {
          $project: {
            _id: 0,
            label: '$_id',
            value: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $match: { originNormalized: { $nin: ['', null] } } },
        {
          $group: {
            _id: '$originNormalized',
            value: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
        {
          $project: {
            _id: 0,
            label: '$_id',
            value: 1,
          },
        },
      ]),

      DashboardData.aggregate([
        getBaseAddFieldsStage(),
        { $match: baseMatch },
        { $sort: { arrivalDateNormalized: -1, _id: -1 } },
        { $limit: 30 },
        {
          $project: {
            _id: 0,
            recordNo: { $ifNull: ['$Record_No', '$Plate_No'] },
            supplier: '$supplierNormalized',
            arrivalDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$arrivalDateNormalized',
              },
            },
            arrivalTime: '$arrivalTimeString',
            pallets: { $round: ['$palletsNumeric', 2] },
            vehicleType: '$vehicleTypeNormalized',
            origin: '$originNormalized',
            waitingDays: '$waitingDaysNumeric',
            status: {
              $cond: [{ $ifNull: ['$Unloaded_Date', false] }, 'Unloaded', 'In Progress'],
            },
          },
        },
      ]),
    ])

    return res.status(200).json({
      receptionsByDay,
      receptionsByWeek,
      arrivalsByHour,
      vehicleTypeDistribution,
      originDistribution,
      recentShipments,
    })
  } catch (error) {
    console.error('Dashboard operations error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

router.get('/supplier', protect, requireDashboardAccess, async (req, res) => {
  try {
    const filters = parseDashboardFilters(req.query)
    const rows = await DashboardData.aggregate([
      getBaseAddFieldsStage(),
      { $match: buildBaseMatch(filters) },
      { $match: { supplierNormalized: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$supplierNormalized',
          totalPallets: { $sum: '$palletsNumeric' },
          records: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          supplier: '$_id',
          totalPallets: { $round: ['$totalPallets', 2] },
          records: 1,
        },
      },
      { $sort: { totalPallets: -1, supplier: 1 } },
    ])

    return res.status(200).json(rows)
  } catch (error) {
    console.error('Dashboard supplier error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

export default router
