import { describe, expect, it } from '@jest/globals';
import { LeaveStatus, LeaveType } from '@workspace/db';
import { BadRequestException } from '@nestjs/common';
import { parseLeaveType, parseLeaveStatus } from './leave-type.helpers';

const someType = Object.values(LeaveType)[0] as LeaveType;
const someStatus = Object.values(LeaveStatus)[0] as LeaveStatus;

describe('parseLeaveType', () => {
  it('accepts a valid leave type', () => {
    expect(parseLeaveType(someType)).toBe(someType);
  });

  it('rejects an unsupported leave type', () => {
    expect(() => parseLeaveType('NOT_A_TYPE')).toThrow(BadRequestException);
  });
});

describe('parseLeaveStatus', () => {
  it('accepts a valid leave status', () => {
    expect(parseLeaveStatus(someStatus)).toBe(someStatus);
  });

  it('rejects an unsupported leave status', () => {
    expect(() => parseLeaveStatus('NOT_A_STATUS')).toThrow(BadRequestException);
  });
});
