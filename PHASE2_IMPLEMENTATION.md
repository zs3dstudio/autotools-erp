# AutoTools ERP Phase-2 Implementation Guide

## Overview

Phase-2 extends the Phase-1 financial engine with operational control workflows that protect stock accuracy, formalize purchasing, and ensure controlled transfers and payments. All Phase-1 functionality remains unchanged and fully operational.

## Architecture

Phase-2 is built on a modular architecture with clear separation of concerns:

```
Database Layer (drizzle/schema.ts)
    ↓
Business Logic Layer (server/db.phase2.ts)
    ↓
API Layer (server/routers/phase2.ts)
    ↓
Frontend Layer (client/src/pages/Phase2/*.tsx)
```

## Database Schema Extensions

### 1. Stock Integrity Tables

**`stock_reservations`** - Tracks reserved stock for pending invoices
- `id`: Primary key
- `inventoryItemId`: Reference to inventory item
- `invoiceId`: Reference to invoice
- `invoiceType`: "Sale", "Transfer", or "PurchaseOrder"
- `branchId`: Branch where stock is reserved
- `productId`: Product being reserved
- `quantity`: Number of units reserved
- `status`: "Active", "Released", or "Consumed"
- `createdAt`, `releasedAt`, `consumedAt`: Timestamps

### 2. Purchase Workflow Tables

**`purchase_orders`** - Purchase order master records
- `poNo`: Unique PO number
- `supplierId`: Supplier reference
- `warehouseBranchId`: Destination warehouse
- `status`: "Draft", "Submitted", "Approved", "Received", "Cancelled"
- `totalAmount`: Sum of all line items
- `createdByUserId`: User who created PO

**`purchase_order_items`** - Individual line items in PO
- `poId`: Parent PO reference
- `productId`: Product being ordered
- `quantity`: Ordered quantity
- `unitPrice`: Unit cost
- `totalPrice`: Quantity × Unit Price

**`goods_received_notes`** - GRN master records
- `grnNo`: Unique GRN number
- `poId`: Reference to purchase order
- `supplierId`: Supplier reference
- `status`: "Pending", "Received", "Reversed"
- `totalReceivedAmount`: Sum of received items with unit prices

**`grn_items`** - Individual items received in GRN
- `grnId`: Parent GRN reference
- `poItemId`: Reference to PO item
- `productId`: Product received
- `quantityReceived`: Actual quantity received
- `unitPrice`: Unit cost (may differ from PO)
- `totalPrice`: Quantity × Unit Price

**`landing_costs`** - Additional costs applied to purchases
- `grnId`: Reference to GRN
- `costType`: "Freight", "Customs", "Insurance", etc.
- `amount`: Cost amount
- `description`: Cost details

**`purchase_finalizations`** - Purchase completion records
- `grnId`, `poId`: References to GRN and PO
- `supplierId`, `warehouseBranchId`: Supplier and destination
- `baseAmount`: GRN total
- `totalLandingCosts`: Sum of all landing costs
- `finalAmount`: Base + Landing Costs
- `payableEntryId`: Reference to ledger entry for supplier payable
- `status`: "Pending", "Finalized", "Cancelled"

### 3. Payment Allocation Tables

**`invoices`** - Invoice master records
- `invoiceNo`: Unique invoice number
- `invoiceType`: "Sales", "Purchase", "CreditNote", "DebitNote"
- `referenceId`: Reference to sale/PO/etc.
- `supplierId`, `customerId`: Party references
- `branchId`: Branch issuing invoice
- `totalAmount`: Invoice total
- `paidAmount`: Amount paid so far
- `outstandingAmount`: Total - Paid
- `creditAmount`: Overpayment credit
- `status`: "Draft", "Issued", "PartiallyPaid", "Paid", "Overdue", "Cancelled"
- `dueDate`: Payment due date
- `issuedAt`, `paidAt`: Timestamps

**`invoice_payments`** - Individual payment transactions
- `invoiceId`: Reference to invoice
- `paymentAmount`: Amount paid in this transaction
- `paymentMethod`: "Cash", "Card", "Transfer", "Cheque"
- `reference`: Payment reference number
- `createdByUserId`: User recording payment
- `paymentDate`: When payment was made

**`payment_allocations`** - Links payments to invoices
- `invoiceId`: Invoice being paid
- `paymentId`: Payment transaction
- `allocatedAmount`: Amount allocated to this invoice

**`invoice_aging`** - Invoice aging tracking
- `invoiceId`: Reference to invoice
- `invoiceNo`: Invoice number (denormalized)
- `daysOverdue`: Number of days past due
- `agingBucket`: "Current", "30Days", "60Days", "90Days", "Over90Days"
- `lastPaymentDate`: When last payment was received

## API Endpoints

### Stock Integrity Router (`phase2.stock.*`)

```typescript
// Get available stock for a product at a branch
getAvailableStock({ productId, branchId }) → number

// Check if sufficient stock exists
checkSufficientStock({ productId, branchId, requiredQuantity }) → boolean

// Create stock reservation
createReservation({ inventoryItemId, invoiceId, invoiceType, branchId, productId, quantity })

// Release stock reservation (when invoice cancelled)
releaseReservation({ invoiceId })

// Consume stock reservation (when invoice finalized)
consumeReservation({ invoiceId })

// Get stock valuation by location
getStockValuation({ branchId? }) → StockValuation[]
```

### Purchase Router (`phase2.purchase.*`)

```typescript
// Purchase Order Management
createPO({ poNo, supplierId, warehouseBranchId, notes? })
addPOItem({ poId, productId, quantity, unitPrice })
submitPO({ poId })
approvePO({ poId })

// Goods Received Note
createGRN({ grnNo, poId, supplierId, warehouseBranchId, notes? })
addGRNItem({ grnId, poItemId, productId, quantityReceived, unitPrice })
addLandingCost({ grnId, costType, amount, description? })
receiveGRN({ grnId })

// Purchase Finalization
finalizePurchase({ grnId, poId, supplierId, warehouseBranchId, notes? })
```

### Payment Router (`phase2.payment.*`)

```typescript
// Invoice Management
createInvoice({ invoiceNo, invoiceType, referenceId, branchId, totalAmount, supplierId?, customerId?, dueDate? })
issueInvoice({ invoiceId })
getInvoiceDetails({ invoiceId })

// Payment Recording
recordPayment({ invoiceId, paymentAmount, paymentMethod, reference?, notes? })

// Outstanding Tracking
getSupplierOutstanding({ supplierId })
getCustomerOutstanding({ customerId })
getSupplierBalances() → SupplierBalance[]

// Invoice Aging
updateAging({ invoiceId })
getAgingSummary({ supplierId? }) → AgingSummary[]
```

### Reporting Router (`phase2.reporting.*`)

```typescript
// Stock Valuation Report
stockValuation({ branchId? }) → StockValuation[]

// Supplier Outstanding Balances Report
supplierOutstandingBalances() → SupplierBalance[]

// Invoice Aging Summary Report
invoiceAgingSummary({ supplierId? }) → AgingSummary[]
```

## Business Rules & Workflows

### Stock Integrity Engine

**Rule 1: Prevent Negative Stock**
- All stock operations check available quantity before proceeding
- Transfers and sales are blocked if insufficient stock exists
- Stock can never go negative in the system

**Rule 2: Stock Reservations**
- When an invoice (sale/transfer) is created, stock is reserved
- Reserved stock reduces available quantity but not physical stock count
- Reservation status: Active → Released (if cancelled) or Consumed (if finalized)

**Rule 3: Stock Protection**
- Transfers blocked if source branch has insufficient stock
- Sales blocked if branch stock is unavailable
- Warehouse maintains master stock for all branches

### Purchase Workflow Pipeline

**Workflow Stages:**
1. **Draft**: PO created, items added, not yet submitted
2. **Submitted**: PO submitted for approval
3. **Approved**: PO approved by authorized user
4. **GRN Created**: Goods Received Note created for PO
5. **Received**: GRN items received and temporary stock created
6. **Landing Costs Applied**: Freight, customs, insurance costs added
7. **Finalized**: Purchase completed, supplier payable created in ledger

**Key Features:**
- GRN can be reversed before finalization
- Landing costs tracked separately from base amount
- Supplier payable automatically created in ledger on finalization
- Full audit trail maintained for all operations

### Transfer Workflow System

**Workflow Stages:**
1. **Request**: Branch requests stock transfer
2. **Approval**: Head Office approves request
3. **Dispatch**: Warehouse deducts stock from source
4. **Receive**: Branch receives and adds stock
5. **Complete**: Transfer marked as complete

**Key Features:**
- Stock only moves at Dispatch and Receive stages
- Internal profit logic preserved (70/30 split)
- Transfer profit tracked separately
- Approval workflow prevents unauthorized transfers

### Payment Allocation Engine

**Invoice Lifecycle:**
- Draft → Issued → PartiallyPaid → Paid (or Overdue)

**Payment Features:**
- Full and partial payment support
- Overpayment tracked as credit for future use
- Multiple payments can be allocated to single invoice
- Outstanding balance calculated automatically

**Invoice Aging:**
- Automatic calculation of days overdue
- Categorization into aging buckets:
  - Current (0 days overdue)
  - 30Days (1-30 days overdue)
  - 60Days (31-60 days overdue)
  - 90Days (61-90 days overdue)
  - Over90Days (91+ days overdue)

## Integration with Phase-1

All Phase-2 functionality integrates seamlessly with Phase-1:

- **Cost Flow Logic**: Purchase finalization respects Phase-1 cost flow (FIFO/LIFO/Weighted Average)
- **Ledger Integration**: All transactions post to Phase-1 ledger
- **Profit Calculation**: Transfer profits calculated using Phase-1 logic
- **Branch Ledger**: Branch-wise financial tracking maintained
- **Dashboard**: Phase-1 KPIs updated with Phase-2 data

## Testing

Comprehensive vitest test suites provided:

- **`phase2.stock.test.ts`**: Stock integrity and reservation tests
- **`phase2.purchase.test.ts`**: Purchase workflow end-to-end tests
- **`phase2.payment.test.ts`**: Payment allocation and aging tests

Run tests with:
```bash
pnpm test
```

## Frontend Integration

Phase-2 frontend components should be created in:
```
client/src/pages/Phase2/
├── StockManagement.tsx
├── PurchaseWorkflow.tsx
├── TransferWorkflow.tsx
├── PaymentAllocation.tsx
└── OperationalReports.tsx
```

Each component should:
1. Use tRPC hooks to call Phase-2 routers
2. Display loading/error states
3. Implement optimistic updates where appropriate
4. Show success/error toasts for operations
5. Follow existing UI patterns from Phase-1

## Error Handling

All Phase-2 operations include error handling:

- **Insufficient Stock**: Returns error if stock check fails
- **Invalid Status Transition**: Prevents invalid workflow transitions
- **Missing References**: Validates all foreign key references
- **Duplicate Numbers**: Prevents duplicate PO/GRN/Invoice numbers

## Performance Considerations

- Stock availability checks use indexed queries
- Batch operations for multiple items
- Aggregations cached where possible
- Ledger entries posted asynchronously where safe

## Future Enhancements

Potential Phase-3 features:
- Automated reorder point calculations
- Supplier performance metrics
- Demand forecasting
- Inventory optimization
- Advanced payment terms (early payment discounts, late fees)
- Multi-currency support
- Barcode/RFID integration

## Support & Maintenance

For issues or questions:
1. Check test files for usage examples
2. Review database schema for field definitions
3. Examine router implementations for API contracts
4. Refer to Phase-1 documentation for integration details
