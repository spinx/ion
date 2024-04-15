import { ComponentResourceOptions, Output, all } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component } from "../component";
import { Input } from "../input.js";
import { DnsAdapter } from "../base/dns-adapter";

/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface DnsValidatedCertificateArgs {
  /**
   * The fully qualified domain name in the certificate.
   */
  domainName: Input<string>;
  /**
   * Set of domains that should be SANs in the issued certificate
   */
  alternativeNames?: Input<string[]>;
  /**
   * The DNS adapter you want to use for managing DNS records. Here is a list of currently
   * suuported [DNS adapters](/docs/component/dns-adapter).
   */
  dns: Input<DnsAdapter>;
}

export class DnsValidatedCertificate extends Component {
  private certificateValidation:
    | aws.acm.CertificateValidation
    | Output<aws.acm.CertificateValidation>;

  constructor(
    name: string,
    args: DnsValidatedCertificateArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const { domainName, alternativeNames, dns } = args;

    const certificate = createCertificate();
    const records = createDnsRecords();
    this.certificateValidation = validateCertificate();

    function createCertificate() {
      return new aws.acm.Certificate(
        `${name}Certificate`,
        {
          domainName,
          validationMethod: "DNS",
          subjectAlternativeNames: alternativeNames ?? [],
        },
        { parent },
      );
    }

    function createDnsRecords() {
      return all([dns, certificate.domainValidationOptions]).apply(
        ([dns, options]) =>
          options.map((option) =>
            dns.createRecord({
              type: option.resourceRecordType,
              name: option.resourceRecordName,
              value: option.resourceRecordValue,
            }),
          ),
      );
    }

    function validateCertificate() {
      return new aws.acm.CertificateValidation(
        `${name}Validation`,
        {
          certificateArn: certificate.arn,
        },
        { parent, dependsOn: records },
      );
    }
  }

  public get arn() {
    return this.certificateValidation.certificateArn;
  }
}

const __pulumiType = "sst:aws:Certificate";
// @ts-expect-error
DnsValidatedCertificate.__pulumiType = __pulumiType;
