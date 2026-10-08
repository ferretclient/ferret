import type { T_RunnerRequestExecutionResult } from '../../types';
import { logoDataUri } from './logo';

export const getFilteredRequestResults = (results: T_RunnerRequestExecutionResult[] = [], onlyFailed = false) => {
  const indexedResults = (Array.isArray(results) ? results : []).map((value, index) => ({ value, index }));

  if (!onlyFailed) {
    return indexedResults;
  }

  return indexedResults.filter(
    ({ value }) =>
      value?.status === 'error'
      || !!value?.testResults?.find((t) => t.status !== 'pass')
      || !!value?.assertionResults?.find((t) => t.status !== 'pass')
  );
};

// `inlineScripts` carries the Vue and naive-ui bundles as inline <script> tags so the report opens offline.
export const htmlTemplateString = (resutsJsonString: string, inlineScripts = '') => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    ${inlineScripts}

    <title>Ferret</title>
    <style>
      .error > .status {
        color: red;
      }
      .success > .status {
        color: green;
      }

      .n-collapse-item.success > .n-collapse-item__header {
        background-color: rgba(237, 247, 242, 1);
      }
      .n-collapse-item.error > .n-collapse-item__header {
        background-color: rgba(251, 238, 241, 1);
      }
      .skipped > .status {
        color: orange;
      }

      .min-width-150 {
        min-width: 150px;
      }

      /* Metadata card styling - minimal custom styles */
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }

      .metadata-item {
        text-align: center;
        padding: 6px 8px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
      }

      .metadata-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
        opacity: 0.7;
      }

      .metadata-value {
        font-size: 0.8rem;
        font-weight: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <n-config-provider :theme="theme">
        <n-layout embedded position="absolute" content-style="padding: 24px;">
          <n-card>
            <n-flex>
              <n-page-header title="Ferret run dashboard">
                <template #avatar>
                  <n-avatar size="large" style="background-color: transparent">
                    <img src="${logoDataUri}" width="34" height="34" alt="Ferret" />
                  </n-avatar>
                </template>
                <template #extra>
                  <n-flex justify="end">
                    <n-switch v-model:value="darkMode" :rail-style="darkModeRailStyle">
                      <template #checked> Dark </template>
                      <template #unchecked> Light </template>
                    </n-switch>
                  </n-flex>
                </template>
              </n-page-header>
              <n-tabs type="segment" animated v-model:value="currentTab">
                <n-tab-pane name="summary" tab="Summary">
                  <n-flex justify="center" vertical>
                    <!-- Run Information Card using Naive UI components -->
                    <n-card title="Run Information" size="small">
                      <div class="metadata-grid">
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Date & Time</div>
                          <div class="metadata-value">{{ runCompletionTime }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Version</div>
                          <div class="metadata-value">{{ ferretVersion }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Environment</div>
                          <div class="metadata-value">{{ environment }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Total run duration</div>
                          <div class="metadata-value">{{ totalDuration }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Total data received</div>
                          <div class="metadata-value">{{ totalDataReceived }}</div>
                        </n-card>
                        <n-card class="metadata-item" size="small">
                          <div class="metadata-label">Average response time</div>
                          <div class="metadata-value">{{ averageResponseTime }}</div>
                        </n-card>
                      </div>
                    </n-card>
                    <x-summary v-for="(result, index) in res" :res="result" :key="index"></x-summary>
                  </n-flex>
                </n-tab-pane>
                <n-tab-pane name="requests" tab="Requests">
                  <n-flex justify="center" vertical>
                    <x-requests v-for="(result, index) in res" :res="result" :key="index"></x-requests>
                  </n-flex>
                </n-tab-pane>
              </n-tabs>
            </n-flex>
          </n-card>
        </n-layout>
      </n-config-provider>
    </div>
    <script type="text/x-template" id="summary-component">
      <n-flex vertical style="margin-bottom: 50px;">
        <n-card>
          <template #header>
            <span style="font-size: 24px;">{{ iterationTitle }}</span>
          </template>
          <n-flex justify="center">
            <n-flex justify="center">
              <n-alert type="success">
                <n-statistic
                  label="Total requests"
                  :value="summaryTotalRequests"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryErrors ? 'error' : 'success'">
                <n-statistic label="Total errors" :value="summaryErrors">
                </n-statistic>
              </n-alert>
              <n-alert type="success">
                <n-statistic
                  label="Total Controls"
                  :value="summaryTotalControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryFailedControls ? 'error' : 'success'">
                <n-statistic
                  label="Total Failed Controls"
                  :value="summaryFailedControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert type="warning" v-if="summarySkippedRequests">
                <n-statistic label="Skipped requests" :value="summarySkippedRequests">
                </n-statistic>
              </n-alert>
            </n-flex>
          </n-flex>
        </n-card>
        <n-data-table :columns="summaryColumns" :data="summaryData" />
      </n-flex>
    </script>
    <script type="text/x-template" id="requests-component">
      <n-card>
        <template #header>
          <span style="font-size: 24px;">{{ iterationTitle }}</span>
        </template>
        <n-flex vertical style="margin-bottom: 50px">
          <n-switch
            v-model:value="onlyFailed"
            :rail-style="railStyle"
          >
            <template #checked> Only Failed </template>
            <template #unchecked> Show All </template>
          </n-switch>

          <n-collapse>
            <x-result v-for="result in results" :result="result.value" :index="result.index" :key="result.index"></x-result>
          </n-collapse>
        </n-flex>
      </n-card>
    </script>
    <script type="text/x-template" id="result-component">
      <n-collapse-item
        :name="resultTitle"
        arrow-placement="right"
      >
        <template #header>
          <n-alert
            :type="getAlertType"
            :bordered="false"
          >
            <template #header>
              {{result.path}} - {{resultSummary}} {{hasError && result.response.status !== 'skipped' ? " - (request failed)" : "" }}
            </template>
          </n-alert>
        </template>
        <n-flex vertical>
          <n-grid x-gap="12" :cols="2">
            <n-gi>
              <n-card title="REQUEST INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="File"
                      :description="result.path"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request Method"
                      :description="result.request.method"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request URL"
                      :description="result.request.url"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="RESPONSE INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="Response Code"
                      :description="responseCode"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Response time"
                      :description="result.response.responseTime + ' ms'"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Test duration"
                      :description="testDuration"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
          <n-alert v-if="hasError || (result.response.status === 'skipped' && result.error)" title="Error" type="error">
            {{result.error}}
          </n-alert>
          <n-card title="REQUEST HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataRequest"
            />
          </n-card>
          <n-card
            v-if="result.request.data"
            title="REQUEST BODY"
          >
          <iframe
            v-if="result.request.isHtml"
            :srcdoc="result.request.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.request.data }}</pre>
          </n-card>
          <n-card title="RESPONSE HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataResponse"
            />
          </n-card>
          <n-card
            v-if="result.response.data"
            title="RESPONSE BODY"
          >
          <iframe
            v-if="result.response.isHtml"
            :srcdoc="result.response.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.response.data }}</pre>          </n-card>
          <n-card title="ASSERTIONS INFORMATION">
            <n-data-table
              :columns="assertionsColumns"
              :data="result.assertionResults"
              :row-class-name="assertionsRowClassName"
            />
          </n-card>
          <n-card title="TESTS INFORMATION">
            <n-data-table
              :columns="testsColumns"
              :data="result.testResults"
              :row-class-name="testsRowClassName"
            />
          </n-card>
        </n-flex>
      </n-collapse-item>
    </script>
    <script>
      const { createApp, ref, computed, onMounted } = Vue;

      const getFilteredRequestResults = ${getFilteredRequestResults.toString()};

      function mergeTests(runnerResults) {
        if (!Array.isArray(runnerResults)) return runnerResults; 

        runnerResults.forEach(iteration => {
          const { totalTests, passedTests, failedTests, totalPreRequestTests, passedPreRequestTests, failedPreRequestTests, totalPostResponseTests, passedPostResponseTests, failedPostResponseTests } = iteration.summary;
          
          // Merge summary test counts
          iteration.summary.totalTests = totalTests + totalPreRequestTests + totalPostResponseTests;
          iteration.summary.passedTests = passedTests + passedPreRequestTests + passedPostResponseTests;
          iteration.summary.failedTests = failedTests + failedPreRequestTests + failedPostResponseTests;
          
          // Merge individual result test arrays
          iteration.results.forEach(result => {
            result.testResults = [
              ...(result.preRequestTestResults || []),
              ...(result.postResponseTestResults || []),
              ...(result.testResults || [])
            ];
          }); 
        });
        
        return runnerResults;
      }

      const App = {
        setup() {
          function decodeBase64(base64) {
            const binary = atob(base64);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            return new TextDecoder().decode(bytes);
          }
          const rawResults = JSON.parse(decodeBase64('${resutsJsonString}'));

          const res = computed(() => {
            return mergeTests(rawResults.results);
          });

          const ferretVersion = computed(() => {
            return rawResults.version || '-';
          });

          const environment = computed(() => {
            return rawResults.environment || '-';
          });

          const runCompletionTime = computed(() => {
            if (rawResults.runCompletionTime) {
              return new Date(rawResults.runCompletionTime).toLocaleString();
            }
            return '-';
          });

          const currentTab = ref('summary');

          const getTabFromQueryParam = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tab = urlParams.get('tab');
            return tab && ['summary', 'requests'].includes(tab) ? tab : 'summary';
          };

          onMounted(() => {
            currentTab.value = getTabFromQueryParam();
          });

          const darkMode = ref(false);
          const theme = computed(() => {
            return darkMode.value ? naive.darkTheme : null;
          });

          const totalDuration = computed(() => {
            const total = res.value.reduce((totalTime, iteration) => {
              return totalTime + iteration.results.reduce((sum, result) => sum + (result.runDuration || 0), 0);
            }, 0);
            return total > 0 ? Math.round(total * 1000) / 1000 + 's' : '-';
          });

          const totalDataReceived = computed(() => {
            const bytes = res.value.reduce((total, iteration) => {
              return total + iteration.results.reduce((sum, result) => {
                const responseData = result.response?.data;
                if (typeof responseData === 'string') {
                  return sum + new Blob([responseData]).size;
                }
                return sum + (JSON.stringify(responseData || {}).length || 0);
              }, 0);
            }, 0);
            
            if (bytes === 0) return '-';
            if (bytes < 1024) return bytes + 'B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
            return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
          });

          const averageResponseTime = computed(() => {
            let totalTime = 0;
            let count = 0;
            
            res.value.forEach(iteration => {
              iteration.results.forEach(result => {
                if (result.response?.responseTime) {
                  totalTime += result.response.responseTime;
                  count++;
                }
              });
            });
            
            return count > 0 ? Math.round(totalTime / count) + 'ms' : '-';
          });

          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode.value = true;
          }
          // To watch for os theme changes
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            darkMode.value = event.matches;
          });
          return {
            res,
            theme,
            darkMode,
            darkModeRailStyle: () => ({ background: 'var(--n-rail-color)' }),
            currentTab,
            ferretVersion,
            environment,
            totalDuration,
            totalDataReceived,
            averageResponseTime,
            runCompletionTime
          };
        }
      };
      const app = Vue.createApp(App);

      app.component('x-summary', {
        template: '#summary-component',
        props: ['res'],
        setup(props) {
          const summaryColumns = [
            {
              title: 'SUMMARY ITEM',
              key: 'title'
            },
            {
              title: 'TOTAL',
              key: 'total'
            },
            {
              title: 'PASSED',
              key: 'passed'
            },
            {
              title: 'FAILED',
              key: 'failed'
            },
            {
              title: 'SKIPPED',
              key: 'skipped'
            },
            {
              title: 'ERROR',
              key: 'error'
            }
          ];
          const summaryData = computed(() => [
            {
              title: 'Requests',
              total: props.res.summary.totalRequests,
              passed: props.res.summary.passedRequests,
              failed: props.res.summary.failedRequests,
              skipped: props.res.summary.skippedRequests,
              error: props.res.summary.errorRequests
            },
            {
              title: 'Assertions',
              total: props.res.summary.totalAssertions,
              passed: props.res.summary.passedAssertions,
              failed: props.res.summary.failedAssertions,
              skipped: '-',
              error: '-'
            },
            {
              title: 'Tests',
              total: props.res.summary.totalTests,
              passed: props.res.summary.passedTests,
              failed: props.res.summary.failedTests,
              skipped: '-',
              error: '-'
            }
          ]);
          const summaryTotalRequests = computed(() => {
            return props.res.summary.totalRequests;
          });
          const summaryTotalControls = computed(() => {
            return props.res.summary.totalTests + props.res.summary.totalAssertions;
          });
          const summaryFailedControls = computed(
            () => props.res.summary.failedTests + props.res.summary.failedAssertions
          );
          const summarySkippedRequests = computed(() => props?.res?.summary?.skippedRequests || 0);
          const summaryErrors = computed(() => props?.res?.results?.filter((r) => r.error || r.status === 'error').length) || 0;
          const totalRunDuration = computed(() => props.res?.results?.reduce((total, result) => result.runDuration + total, 0));
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            summaryColumns,
            summaryData,
            summaryTotalControls,
            summaryTotalRequests,
            summaryFailedControls,
            summarySkippedRequests,
            summaryErrors,
            totalRunDuration,
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-requests', {
        template: '#requests-component',
        props: ['res'],
        setup(props) {
          const onlyFailed = ref(false);
          const filteredResults = computed(() => {
            return getFilteredRequestResults(props?.res?.results, onlyFailed.value);
          });
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            onlyFailed,
            results: filteredResults,
            railStyle: ({ checked }) => {
              const style = {};
              if (checked) {
                style.background = '#d03050';
              }
              return style;
            },
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-result', {
        template: '#result-component',
        props: ['result', 'index'],
        setup(props) {
          const headerColumns = [
            {
              title: 'Header Name',
              key: 'name',
              className: 'min-width-150'
            },
            {
              title: 'Header Value',
              key: 'value'
            }
          ];
          const assertionsColumns = [
            {
              title: 'Expression',
              key: 'lhsExpr'
            },
            {
              title: 'Operator',
              key: 'operator'
            },
            {
              title: 'Operand',
              key: 'rhsOperand'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];
          const assertionsRowClassName = (row) => {
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsRowClassName = (row) => {
            if (row.status === 'skipped') return 'skipped';
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsColumns = [
            {
              title: 'Description',
              key: 'description'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];

          function mapHeaderToTableData(headers) {
            if (!headers) {
              return [];
            }
            return Object.keys(headers).map((name) => ({
              name,
              value: headers[name]
            }));
          }
          const headerDataRequest = computed(() => {
            return mapHeaderToTableData(props?.result?.request?.headers);
          });
          const headerDataResponse = computed(() => {
            return mapHeaderToTableData(props?.result?.response?.headers);
          });
          const totalPassed = computed(() => {
            return (
              (props?.result?.testResults?.filter((t) => t.status === 'pass').length || 0) +
              (props?.result?.assertionResults?.filter((t) => t.status === 'pass').length || 0)
            );
          });
          const total = computed(() => {
            return (props?.result?.testResults?.length || 0) + (props?.result?.assertionResults?.length || 0);
          });

          const hasError = computed(() => !!props?.result?.error || props?.result?.status === 'error' || (props?.result?.response?.status === 'skipped' && props?.result?.error));
          const hasFailure = computed(() => total.value !== totalPassed.value);
          const testDuration = computed(() => Math.round(props?.result?.runDuration * 1000) + ' ms');
          const resultTitle = computed(() => props?.result?.path + ' ' + props?.result?.response?.status + ' ' + props?.result?.response?.statusText + ' ' + props?.index);
          const responseCode = computed(() => {
            if (props.result.response.status === 'skipped') {
              return '-';
            }
            return '' + props.result.response.status;
          });
          const resultSummary = computed(() => {
            if (props.result.response.status === 'skipped') {
              return props.result.skipReason === 'bail' ? 'Request skipped due to bail' : 'Request Skipped';
            }
            return totalPassed.value + '/' + total.value + ' Passed';
          });
          const getAlertType = computed(() => {
            if (props.result.response.status === 'skipped') {
              return 'warning';
            }
            return hasError.value || hasFailure.value ? 'error' : 'success';
          });
          return {
            headerColumns,
            headerDataRequest,
            headerDataResponse,
            assertionsColumns,
            assertionsRowClassName,
            testsRowClassName,
            totalPassed,
            total,
            hasFailure,
            hasError,
            testsColumns,
            result: props.result,
            testDuration,
            responseCode,
            resultTitle,
            resultSummary,
            getAlertType,
            iterationIndex: props?.result?.iterationIndex
          };
        }
      });

      app.use(naive);
      app.mount('#app');
    </script>
  </body>
</html>
`;

export default htmlTemplateString;
