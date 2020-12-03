const cds = require('@sap/cds')

/** Service implementation for CatalogService */
module.exports = cds.service.impl(async function () {
  const { Books, Orders, BusinessPartners } = this.entities
  const bupaSrv = await cds.connect.to('API_BUSINESS_PARTNER')
  this.after('READ', Books, each => each.stock > 111 && _addDiscount2(each, 11))
  this.before('CREATE', Orders, _reduceStock)
  this.on('READ', BusinessPartners, req => bupaSrv.tx(req).run(req.query))
  // this.on('READ', BusinessPartners, req => { 
  //   bupaSrv.tx(req).run(UPDATE(BusinessPartners).set('FirstName', 'Mathias').where('ID =', '1000000'))
  // })
  // this.on('READ', BusinessPartners, req => { 
  //   bupaSrv.tx(req).run(INSERT.into(BusinessPartners).entries(
  //       {
  //           ID:              "%1",
  //           FirstName:       "Mathias",
  //           MiddleName:     "Guenther",
  //           LastName:       "Eichel",
  //           BusinessPartnerIsBlocked: false
  //       } 
  //   ))
  //  })
  //       {
  //           ID:              "1000002",
  //           FirstName:       "Mathias",
  //           MiddleName:     "Guenther",
  //           LastName:       "Eichel",
  //           BusinessPartnerIsBlocked: false
  //       } 
  //   ))
  //  })
  /** Add some discount for overstocked books */
  function _addDiscount2(each, discount) {
    each.title += ` -- ${discount}% discount!`
  }

  /** Reduce stock of ordered books if available stock suffices */
  async function _reduceStock(req) {
    const { Items: OrderItems } = req.data
    return cds.transaction(req).run(() => OrderItems.map(order =>
      UPDATE(Books).set('stock -=', order.amount)
        .where('ID =', order.book_ID).and('stock >=', order.amount)
    )).then(all => all.forEach((affectedRows, i) => {
      if (affectedRows === 0) req.error(409,
        `${OrderItems[i].amount} exceeds stock for book #${OrderItems[i].book_ID}`
      )
    }))
  }
})
