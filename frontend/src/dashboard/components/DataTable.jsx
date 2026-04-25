function DataTable({ columns, rows, emptyMessage = 'No records found.' }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : null}

          {rows.map((row, rowIndex) => (
            <tr key={`${row.id || row.recordNo || 'row'}-${rowIndex}`}>
              {columns.map((column) => (
                <td key={column.key}>
                  {typeof column.render === 'function'
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable

