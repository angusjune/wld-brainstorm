/*
 * The authoritative, runnable WLD (微粒贷) loan calculator for the fix-details skill.
 *
 * Dependency-free: `big.js` is imported from the vendored ./big.mjs (MIT, see the
 * header in that file) so the script runs with plain `node` and no npm install.
 * A small CLI wrapper at the bottom parses JSON params, applies friendly
 * conveniences (annualRate→dailyRate at a fixed 360-day base, default
 * firstBillingDate), and prints a JSON result.
 *
 * This file is the single source of truth for WLD loan math — verify displayed
 * numbers against it; never recompute 利息/还款额 by hand.
 *
 * Usage:
 *   node calc.mjs '{"annualRate":0.144,"principal":60000,"term":12,"loanDate":"2026-06-08","coupons":[{"type":"INTEREST_REDUCTION","days":30}]}'
 *   echo '{...}' | node calc.mjs            # params can also be piped on stdin
 */

import Big from './big.mjs';

/** 优惠券类型 */
const CouponType = Object.freeze({
  INTEREST_REDUCTION: 'INTEREST_REDUCTION', // 免息期
  DISCOUNT: 'DISCOUNT', // 利率折扣
  DESIGNATED_RATE: 'DESIGNATED_RATE', // 指定利率
});

/** 还款方式 */
const RepaymentType = Object.freeze({
  EQUAL_AMORTIZATION: 'EQUAL_AMORTIZATION', // 等额本息
  INTEREST_FIRST: 'INTEREST_FIRST', // 先息后本
  EQUAL_PRINCIPAL: 'EQUAL_PRINCIPAL', // 等额本金
  HYBRID_INTEREST_FIRST: 'HYBRID_INTEREST_FIRST', // 灵活先息后本
  STAGED_RATE: 'STAGED_RATE', // 分段利率（N+M）
});

function roundCurrencyHalfUp(value) {
  return new Big(value).round(2, Big.roundHalfUp).toNumber();
}

/** 计算每期的调整后利率 */
function calculateAdjustedRates(baseRate, termDays, coupons = [], stagedRate, stagedTerms = 0) {
  const result = termDays.map((_, index) => ({
    rate: stagedRate !== undefined && index < stagedTerms ? stagedRate : baseRate,
    interestFreeDays: 0,
    explanation: '',
  }));

  for (const coupon of coupons) {
    switch (coupon.type) {
      case CouponType.INTEREST_REDUCTION:
        applyInterestReductionCoupon(result, termDays, coupon);
        break;
      case CouponType.DISCOUNT:
        applyDiscountCoupon(result, coupon);
        break;
      case CouponType.DESIGNATED_RATE:
        applyDesignatedRateCoupon(result, coupon);
        break;
    }
  }

  return result;
}

/** 应用免息期优惠券 */
function applyInterestReductionCoupon(rateInfo, termDays, coupon) {
  let remainingDays = coupon.days;
  let periodIndex = 0;

  while (remainingDays > 0 && periodIndex < termDays.length) {
    const periodDays = termDays[periodIndex];
    const daysToApply = Math.min(remainingDays, periodDays);

    rateInfo[periodIndex].interestFreeDays += daysToApply;

    if (daysToApply > 0) {
      rateInfo[periodIndex].explanation += rateInfo[periodIndex].explanation
        ? `，免息${daysToApply}天`
        : `免息${daysToApply}天`;
    }

    remainingDays -= daysToApply;
    periodIndex++;
  }
}

/** 应用利率折扣优惠券 */
function applyDiscountCoupon(rateInfo, coupon) {
  const termsToApply = Math.min(coupon.terms, rateInfo.length);
  const discountPercent = Math.round((1 - coupon.discountRate) * 100);

  for (let i = 0; i < termsToApply; i++) {
    rateInfo[i].rate = new Big(rateInfo[i].rate).times(coupon.discountRate).toNumber();
    rateInfo[i].explanation += rateInfo[i].explanation
      ? `，利率优惠${discountPercent}%`
      : `利率优惠${discountPercent}%`;
  }
}

/** 应用指定利率优惠券 */
function applyDesignatedRateCoupon(rateInfo, coupon) {
  const termsToApply = Math.min(coupon.terms, rateInfo.length);

  for (let i = 0; i < termsToApply; i++) {
    rateInfo[i].rate = coupon.rate;
    rateInfo[i].explanation += rateInfo[i].explanation
      ? `，指定利率${coupon.rate.toFixed(6)}`
      : `指定利率${coupon.rate.toFixed(6)}`;
  }
}

/** 计算月度还款金额 */
function calculateMonthlyInstallment(principal, rateInfo, termDays, repaymentType = RepaymentType.EQUAL_AMORTIZATION) {
  if (repaymentType !== RepaymentType.EQUAL_AMORTIZATION && repaymentType !== RepaymentType.STAGED_RATE) {
    return 0;
  }

  // X = P * product(1 + days[i] * rate[i])
  let X = new Big(principal);
  for (let i = 0; i < termDays.length; i++) {
    const factor = new Big(1).plus(new Big(termDays[i]).times(rateInfo[i].rate));
    X = X.times(factor);
  }

  // Y = 1 + sum(product(1 + days[j] * rate[j]) for j from i to n-1) for i from 1 to n-1
  let Y = new Big(1);
  for (let i = 1; i < termDays.length; i++) {
    let T = new Big(1);
    for (let j = i; j < termDays.length; j++) {
      const factor = new Big(1).plus(new Big(termDays[j]).times(rateInfo[j].rate));
      T = T.times(factor);
    }
    Y = Y.plus(T);
  }

  return X.div(Y).round(2, Big.roundHalfUp).toNumber();
}

/** 生成分期还款明细表 */
function generateAmortizationSchedule(
  principal,
  monthlyPayment,
  standardDailyRate,
  termDays,
  rateInfo,
  repaymentDates,
  repaymentType = RepaymentType.EQUAL_AMORTIZATION,
  interestFirstTerms = 0,
) {
  const schedule = [];
  let remainingPrincipal = new Big(principal);
  const totalTerms = termDays.length;

  const hybridPrincipalTerms =
    repaymentType === RepaymentType.HYBRID_INTEREST_FIRST ? Math.max(1, totalTerms - interestFirstTerms) : 0;

  let equalPrincipalAmount = new Big(0);
  if (repaymentType === RepaymentType.EQUAL_PRINCIPAL) {
    equalPrincipalAmount = new Big(principal).div(totalTerms).round(2, Big.roundHalfUp);
  } else if (repaymentType === RepaymentType.HYBRID_INTEREST_FIRST) {
    equalPrincipalAmount = new Big(principal).div(hybridPrincipalTerms).round(2, Big.roundHalfUp);
  }

  for (let i = 0; i < termDays.length; i++) {
    const days = termDays[i];
    const { rate: effectiveRate, interestFreeDays, explanation } = rateInfo[i];
    const effectiveDays = Math.max(0, days - interestFreeDays);

    const interestPayment = remainingPrincipal
      .times(effectiveRate)
      .times(effectiveDays)
      .round(2, Big.roundHalfUp)
      .toNumber();

    const fullInterestPayment = remainingPrincipal
      .times(effectiveRate)
      .times(days)
      .round(2, Big.roundHalfUp)
      .toNumber();

    let principalPayment = 0;

    if (repaymentType === RepaymentType.INTEREST_FIRST) {
      if (i === totalTerms - 1) {
        principalPayment = remainingPrincipal.toNumber();
      }
    } else if (repaymentType === RepaymentType.EQUAL_PRINCIPAL) {
      if (i === totalTerms - 1) {
        principalPayment = remainingPrincipal.toNumber();
      } else {
        principalPayment = equalPrincipalAmount.toNumber();
      }
    } else if (repaymentType === RepaymentType.HYBRID_INTEREST_FIRST) {
      if (i < interestFirstTerms) {
        principalPayment = 0;
      } else if (i === totalTerms - 1) {
        principalPayment = remainingPrincipal.toNumber();
      } else {
        principalPayment = equalPrincipalAmount.toNumber();
      }
    } else {
      // 等额本息
      if (i === totalTerms - 1) {
        principalPayment = remainingPrincipal.toNumber();
      } else {
        principalPayment = roundCurrencyHalfUp(new Big(monthlyPayment).minus(fullInterestPayment));
      }
    }

    const totalPayment = roundCurrencyHalfUp(new Big(principalPayment).plus(interestPayment));

    schedule.push({
      period: i + 1,
      repaymentDate: repaymentDates[i],
      remainingPrincipal: remainingPrincipal.round(2, Big.roundHalfUp).toNumber(),
      principalPayment,
      interestPayment,
      totalPayment,
      appliedRate: effectiveRate,
      couponApplied: explanation || undefined,
    });

    remainingPrincipal = remainingPrincipal.minus(principalPayment);
  }

  return schedule;
}

/** 计算贷款每月还款金额 */
function calculateLoanPayments(
  principal,
  dailyRate,
  termDays,
  repaymentDates,
  coupons = [],
  earlyRepaymentDate,
  repaymentType = RepaymentType.EQUAL_AMORTIZATION,
  interestFirstTerms = 0,
  stagedRate,
  stagedTerms = 0,
) {
  if (principal <= 0) throw new Error('贷款本金必须大于0');
  if (dailyRate < 0) throw new Error('日利率不能为负数');
  if (termDays.length === 0) throw new Error('贷款期数不能为0');
  if (termDays.length !== repaymentDates.length) throw new Error('还款日期的数量必须与贷款期数一致');
  if (repaymentType === RepaymentType.HYBRID_INTEREST_FIRST) {
    if (!Number.isInteger(interestFirstTerms) || interestFirstTerms < 1) {
      throw new Error('灵活先息后本：先息期数必须为正整数');
    }
    if (interestFirstTerms >= termDays.length) {
      throw new Error('灵活先息后本：先息期数必须小于总期数');
    }
  }
  if (repaymentType === RepaymentType.STAGED_RATE) {
    if (stagedRate === undefined || stagedRate < 0) {
      throw new Error('分段利率：前段利率不能为负数');
    }
    if (!Number.isInteger(stagedTerms) || stagedTerms < 1) {
      throw new Error('分段利率：前段期数必须为正整数');
    }
    if (stagedTerms >= termDays.length) {
      throw new Error('分段利率：前段期数必须小于总期数');
    }
  }

  const effectiveStagedRate = repaymentType === RepaymentType.STAGED_RATE ? stagedRate : undefined;

  const adjustedRates = calculateAdjustedRates(dailyRate, termDays, coupons, effectiveStagedRate, stagedTerms);
  const monthlyPayment = calculateMonthlyInstallment(principal, adjustedRates, termDays, repaymentType);

  let amortizationSchedule = generateAmortizationSchedule(
    principal,
    monthlyPayment,
    dailyRate,
    termDays,
    adjustedRates,
    repaymentDates,
    repaymentType,
    interestFirstTerms,
  );

  if (earlyRepaymentDate) {
    const msPerDay = 1000 * 3600 * 24;
    const loanStartTime = repaymentDates[0].getTime() - termDays[0] * msPerDay;
    const totalDaysToEarly = Math.floor((earlyRepaymentDate.getTime() - loanStartTime) / msPerDay);

    let completedDays = 0;
    let completedPeriods = 0;
    for (const days of termDays) {
      if (completedDays + days <= totalDaysToEarly) {
        completedDays += days;
        completedPeriods++;
      } else {
        break;
      }
    }

    const paidInstallments = amortizationSchedule.slice(0, completedPeriods);
    const principalPaid = paidInstallments.reduce((sum, period) => sum + period.principalPayment, 0);
    const remainingPrincipal = principal - principalPaid;

    const remainingDays = totalDaysToEarly - completedDays;
    const currentPeriodRate = adjustedRates[completedPeriods] || { rate: dailyRate, interestFreeDays: 0, explanation: '' };
    const effectiveDays = Math.max(0, remainingDays - currentPeriodRate.interestFreeDays);

    const finalInterest = new Big(remainingPrincipal)
      .times(currentPeriodRate.rate)
      .times(effectiveDays)
      .round(2, Big.roundHalfUp)
      .toNumber();

    const finalPayment = {
      period: completedPeriods + 1,
      repaymentDate: earlyRepaymentDate,
      remainingPrincipal,
      principalPayment: remainingPrincipal,
      interestPayment: finalInterest,
      totalPayment: remainingPrincipal + finalInterest,
      appliedRate: currentPeriodRate.rate,
      couponApplied: currentPeriodRate.explanation || undefined,
    };

    amortizationSchedule = [...paidInstallments, finalPayment];
  }

  const standardRates = termDays.map((_, index) => ({
    rate: effectiveStagedRate !== undefined && index < stagedTerms ? effectiveStagedRate : dailyRate,
    interestFreeDays: 0,
    explanation: '',
  }));

  const standardMonthlyPayment = calculateMonthlyInstallment(principal, standardRates, termDays, repaymentType);

  const standardSchedule = generateAmortizationSchedule(
    principal,
    standardMonthlyPayment,
    dailyRate,
    termDays,
    standardRates,
    repaymentDates,
    repaymentType,
    interestFirstTerms,
  );

  const totalStandardInterest = standardSchedule.reduce((sum, period) => sum + period.interestPayment, 0);
  const totalDiscountedInterest = amortizationSchedule.reduce((sum, period) => sum + period.interestPayment, 0);
  const totalSavings = Math.round((totalStandardInterest - totalDiscountedInterest) * 100) / 100;

  return { amortizationSchedule, totalSavings, totalInterest: totalDiscountedInterest };
}

/** 计算两个日期之间的天数 */
function calculateDaysBetweenDates(startDate, endDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/** 生成账单日期序列 */
function generateBillingDates(startDate, numberOfPeriods, statementDay) {
  const dates = [new Date(startDate)];
  let currentDate = new Date(startDate);

  for (let i = 0; i < numberOfPeriods; i++) {
    let year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1;

    if (month > 11) {
      year += Math.floor(month / 12);
      month = month % 12;
    }

    const maxDays = new Date(year, month + 1, 0).getDate();
    const targetDay = Math.min(statementDay, maxDays);

    currentDate = new Date(year, month, targetDay);
    dates.push(currentDate);
  }

  return dates;
}

/** 贷款计算主处理函数 */
function processLoanCalculation(
  dailyRate,
  principal,
  term,
  loanDate,
  firstBillingDate,
  coupons = [],
  earlyRepaymentDate,
  repaymentType = RepaymentType.EQUAL_AMORTIZATION,
  interestFirstTerms = 0,
  stagedRate,
  stagedTerms = 0,
) {
  if (!(loanDate instanceof Date) || isNaN(loanDate.getTime())) throw new Error('无效的贷款日期');
  if (!(firstBillingDate instanceof Date) || isNaN(firstBillingDate.getTime())) throw new Error('无效的首次账单日期');
  if (firstBillingDate <= loanDate) throw new Error('首次账单日期必须在贷款日期之后');

  if (earlyRepaymentDate) {
    if (!(earlyRepaymentDate instanceof Date) || isNaN(earlyRepaymentDate.getTime())) {
      throw new Error('无效的提前还款日期');
    }
    if (earlyRepaymentDate <= loanDate) throw new Error('提前还款日期必须在贷款日期之后');
  }

  const billingSchedule = generateBillingDates(firstBillingDate, term - 1, firstBillingDate.getDate());
  const billingDates = [loanDate, ...billingSchedule];

  if (earlyRepaymentDate && earlyRepaymentDate > billingSchedule[billingSchedule.length - 1]) {
    throw new Error('提前还款日期不能晚于最后一期账单日');
  }

  const termDays = [];
  for (let i = 0; i < billingDates.length - 1; i++) {
    termDays.push(calculateDaysBetweenDates(billingDates[i], billingDates[i + 1]));
  }

  return calculateLoanPayments(
    principal,
    dailyRate,
    termDays,
    billingSchedule,
    coupons,
    earlyRepaymentDate,
    repaymentType,
    interestFirstTerms,
    stagedRate,
    stagedTerms,
  );
}

export { processLoanCalculation, calculateLoanPayments, generateBillingDates, CouponType, RepaymentType };

// ----------------------------- CLI wrapper -----------------------------

// WLD annualizes simple interest on a fixed 360-day basis. This is not
// configurable: 年利率 ÷ 360 = 日利率 (e.g. 10.8% ÷ 360 = 0.0003 = 1千元/天0.3元).
const ANNUAL_BASE = 360;

/** loanDate + 1 calendar month (same day-of-month), clamped to month length. */
function addOneMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const maxDays = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), maxDays));
}

function toDate(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error(`无效的日期 ${label}: ${JSON.stringify(value)}`);
  return date;
}

/** Convert friendly JSON params into processLoanCalculation arguments. */
function buildParams(input) {
  const dailyRate =
    input.dailyRate !== undefined
      ? input.dailyRate
      : input.annualRate !== undefined
        ? new Big(input.annualRate).div(ANNUAL_BASE).toNumber()
        : (() => {
            throw new Error('必须提供 dailyRate 或 annualRate');
          })();

  if (input.principal === undefined) throw new Error('必须提供 principal（借款本金）');
  if (input.term === undefined) throw new Error('必须提供 term（期数）');

  const loanDate = toDate(input.loanDate, 'loanDate');
  if (!loanDate) throw new Error('必须提供 loanDate（借款日期），ISO 字符串如 "2026-06-08"');

  const firstBillingDate = toDate(input.firstBillingDate, 'firstBillingDate') ?? addOneMonth(loanDate);

  const coupons = (input.coupons ?? []).map((c) => {
    if (c.type === CouponType.DESIGNATED_RATE && c.rate === undefined && c.annualRate !== undefined) {
      return { ...c, rate: new Big(c.annualRate).div(ANNUAL_BASE).toNumber() };
    }
    return c;
  });

  const stagedRate =
    input.stagedRate !== undefined
      ? input.stagedRate
      : input.stagedAnnualRate !== undefined
        ? new Big(input.stagedAnnualRate).div(ANNUAL_BASE).toNumber()
        : undefined;

  return {
    dailyRate,
    principal: input.principal,
    term: input.term,
    loanDate,
    firstBillingDate,
    coupons,
    earlyRepaymentDate: toDate(input.earlyRepaymentDate, 'earlyRepaymentDate'),
    repaymentType: input.repaymentType ?? RepaymentType.EQUAL_AMORTIZATION,
    interestFirstTerms: input.interestFirstTerms ?? 0,
    stagedRate,
    stagedTerms: input.stagedTerms ?? 0,
  };
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    if (process.stdin.isTTY) resolve('');
  });
}

async function main() {
  let raw = process.argv[2];
  if (!raw) raw = (await readStdin()).trim();
  if (!raw) {
    console.error('用法: node calc.mjs \'{"annualRate":0.144,"principal":60000,"term":12,"loanDate":"2026-06-08","coupons":[{"type":"INTEREST_REDUCTION","days":30}]}\'');
    process.exit(2);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    console.error(`参数不是合法 JSON: ${error.message}`);
    process.exit(2);
  }

  try {
    const p = buildParams(input);
    const result = processLoanCalculation(
      p.dailyRate,
      p.principal,
      p.term,
      p.loanDate,
      p.firstBillingDate,
      p.coupons,
      p.earlyRepaymentDate,
      p.repaymentType,
      p.interestFirstTerms,
      p.stagedRate,
      p.stagedTerms,
    );

    const schedule = result.amortizationSchedule;
    const summary = {
      // friendly display fields for the fix-details skill
      省利息: result.totalSavings, // 省利息 / 优惠减免
      总利息: Math.round(result.totalInterest * 100) / 100,
      首期还款: schedule[0]?.totalPayment ?? null, // 首次还 / 每月还（首期）
      每期还款: schedule.map((item) => item.totalPayment),
      资金占用日利率: p.dailyRate,
      期数: schedule.length,
      schedule: schedule.map((item) => ({
        period: item.period,
        date: item.repaymentDate.toISOString().slice(0, 10),
        totalPayment: item.totalPayment,
        principalPayment: item.principalPayment,
        interestPayment: item.interestPayment,
        appliedRate: item.appliedRate,
        couponApplied: item.couponApplied ?? null,
      })),
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(`计算失败: ${error.message}`);
    process.exit(1);
  }
}

// Run as CLI only when invoked directly (`node calc.mjs ...`), not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
