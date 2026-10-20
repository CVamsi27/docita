import type {
  DoctorEducation,
  DoctorCertification,
  DoctorSpecializationEntry,
} from '@workspace/types';

type NullableOptionalFields<Shape> = {
  [Field in keyof Shape]: undefined extends Shape[Field]
    ? Shape[Field] | null
    : Shape[Field];
};

export function mapDoctorEducationResponse<
  Entry extends NullableOptionalFields<DoctorEducation>,
>(entry: Entry) {
  return {
    ...entry,
    fieldOfStudy: entry.fieldOfStudy ?? undefined,
    location: entry.location ?? undefined,
    startYear: entry.startYear ?? undefined,
    endYear: entry.endYear ?? undefined,
    grade: entry.grade ?? undefined,
    thesis: entry.thesis ?? undefined,
  };
}

export function mapDoctorCertificationResponse<
  Entry extends NullableOptionalFields<DoctorCertification>,
>(entry: Entry) {
  return {
    ...entry,
    expiryDate: entry.expiryDate ?? undefined,
    credentialId: entry.credentialId ?? undefined,
    credentialUrl: entry.credentialUrl ?? undefined,
  };
}

export function mapDoctorSpecializationResponse<
  Entry extends NullableOptionalFields<DoctorSpecializationEntry>,
>(entry: Entry) {
  return {
    ...entry,
    certificationId: entry.certificationId ?? undefined,
    yearsOfPractice: entry.yearsOfPractice ?? undefined,
  };
}
