import React from 'react';

import {
  Form, Icon, Input, Button, Table, Popconfirm, notification,
} from 'antd';
import { connect } from 'react-redux';
import axios from 'axios';
import {
  loadWordsData, addWord, deleteWord, clearWordsState,
} from '../actions/wordsActions';
import {
  errServerConnection,
} from '../../WordGroups/constans/constants';
import { EngWordValidErr, RusWordValidErr } from '../constants/constants';
import { mainUrl } from '../../Base/api/auth/constants';

const FormItem = Form.Item;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
}

class WordsTable extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: 'English Words',
        dataIndex: 'enWord',
        className: 'engWord-col',
        render: text => (
          <div>
            <span>
              {' '}
              {text}
              {' '}
            </span>
          </div>
        ),
      },
      {
        title: 'Russian Word',
        dataIndex: 'ruWord',
        className: 'rus-name-col',
        render: text => (
          <div>
            <span>
              {' '}
              {text}
              {' '}
            </span>
          </div>

        ),
      },
      {
        title: '',
        className: 'remove-word-col-name',
        render: (text, record) => (
          <div className="removeWordCol">
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => this.removeWord(record.id)}
            >
              <Icon className="remove-word-icon" type="close-circle" theme="filled" />
            </Popconfirm>
          </div>
        ),
      },
    ];
  }

    state = {
      loading: true,
      pagination: {},
    };

    componentDidMount() {
      this.props.form.validateFields();
      const { clearWordsState } = this.props;
      clearWordsState();
      this.loadWords();
    }


    // adding new word to group
    handleAddWord = (e) => {
      e.preventDefault();
      const wordGroupsId = this.props.match.params.id;
      this.props.form.validateFields((err, values) => {
        const newWord = { ...values };
        const addWordReq = async (token) => {
          const response = await axios({
            method: 'put',
            url: `${mainUrl}/home/wordgroups/${wordGroupsId}/words`,
            data: {
              enWord: newWord.enWord,
              ruWord: newWord.ruWord,
            },
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
          });
          if (response.status <= 400) {
            return response.data;
          }
          throw new Error(response.status);
        };
        const user = JSON.parse(localStorage.getItem('userInfo'));
        addWordReq(user.token).then((res) => {
          const resWord = res;
          const newAddedWord = {
            id: resWord.id,
            enWord: resWord.enWord,
            ruWord: resWord.ruWord,
            groupId: wordGroupsId,
          };
          this.props.addWord(newAddedWord);
          this.handleReset();
        }).catch((error) => {
          notification.open({
            type: 'error',
            message: errServerConnection,
          });
          console.log(error);
        });
      });
    };

    // reset fields after submitting new word
    handleReset = () => {
      this.props.form.resetFields();
    }

    // delete word from word group
    removeWord = (id) => {
      const wordGroupsId = this.props.match.params.id;
      const user = JSON.parse(localStorage.getItem('userInfo'));
      axios(
        {
          method: 'delete',
          url: `${mainUrl}/home/wordgroups/${wordGroupsId}/words/${id}`,
          headers:
                    {
                      'Content-Type': 'application/json',
                      Authorization: user.token,
                    },
          data: {
          },
        },
      ).then((response) => {
        this.props.deleteWord(id);
      })
        .catch((error) => {
          notification.open({
            type: 'error',
            message: errServerConnection,
          });
        });
    };

    // loading words for this wordgroup from server
    loadWords = () => {
      const wordGroupsId = this.props.match.params.id;
      const wordsApi = async (token) => {
        const response = await axios({
          method: 'get',
          url: `${mainUrl}/home/wordgroups/${wordGroupsId}/words`,
          data: {},
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        });

        if (response.status <= 400) {
          return response.data;
        }
        throw new Error(response.status);
      };
      const user = JSON.parse(localStorage.getItem('userInfo'));
      wordsApi(user.token).then((data) => {
        const dataNew = data;
        const pagination = { ...this.state.pagination };
        this.setState({
          loading: false,
          pagination,
        });
        this.props.loadWordsData(dataNew);
      }).catch((error) => {
        notification.open({
          type: 'error',
          message: errServerConnection,
        });
        this.setState({
          loading: false,
        });
        console.log(error);
      });
    };

    handleTableChange = (pagination, filters, sorter) => {
      const pager = { ...this.state.pagination };
      pager.current = pagination.current;
      this.setState({
        pagination: pager,
      });
      this.loadWordGroups({
        results: pagination.pageSize,
        page: pagination.current,
        sortField: sorter.field,
        sortOrder: sorter.order,
        ...filters,
      });
    }


    render() {
      const {
        getFieldDecorator, getFieldsError, getFieldError, isFieldTouched,
      } = this.props.form;

      const wordGroupName = this.props.match.params.name;
      const { dataSource } = this.props;
      const columns = this.columns.map((col) => {
        if (!col.editable) {
          return col;
        }
        return {
          ...col,
          onCell: record => ({
            record,
            dataIndex: col.dataIndex,
            title: col.title,
            save: this.save,
            escFunction: this.escFunction,
            editing: this.isEditing(record),
            cancel: this.cancel,
          }),
        };
      });

      const enWordError = isFieldTouched('enWord') && getFieldError('enWord');
      const ruWordError = isFieldTouched('ruWord') && getFieldError('ruWord');
      return (
        <div className="words-table">
          <p className="word-gr-name">{wordGroupName}</p>
          <Form layout="inline" onSubmit={this.handleAddWord}>
            <FormItem
              validateStatus={enWordError ? 'error' : ''}
              help={enWordError || ''}
            >
              {getFieldDecorator('enWord', {
                rules: [{
                  required: true,
                  whitespace: true,
                  pattern: '^[A-Za-z -]+$',
                  message: EngWordValidErr,
                }],
              })(
                <Input
                  className="wordInput"
                  prefix={<Icon type="search" theme="outlined" />}
                  placeholder="English Word"
                />,
              )}
            </FormItem>
            <FormItem
              validateStatus={ruWordError ? 'error' : ''}
              help={ruWordError || ''}
            >
              {getFieldDecorator('ruWord', {
                rules: [{
                  required: true,
                  whitespace: true,
                  pattern: '^[А-Яа-яЁё]+$',
                  message: RusWordValidErr,
                }],
              })(
                <Input
                  className="wordInput"
                  prefix={<Icon type="search" theme="outlined" />}
                  placeholder="Russian Word"
                />,
              )}
            </FormItem>
            <FormItem>
              <Button
                type="primary"
                htmlType="submit"
                disabled={hasErrors(getFieldsError())}
                className="addWordsBtn"
              >
                <Icon type="plus" theme="outlined" />
                        Add Word
              </Button>
            </FormItem>
            <Table
              className="wordsInGroups-table"
              columns={columns}
              rowClassName={() => 'words-editable-row'}
              rowKey={record => record.id}
              dataSource={dataSource}
              bordered
              pagination={{ pageSize: 10 }}
              loading={this.state.loading}
              onChange={this.handleTableChange}
            />
          </Form>
        </div>
      );
    }
}

const WrappedWordsTable = Form.create()(WordsTable);

const mapDispatchToProps = dispatch => ({
  loadWordsData: (dataNew) => {
    dispatch(loadWordsData(dataNew));
  },
  addWord: (newWord) => {
    dispatch(addWord(newWord));
  },
  deleteWord: (id) => {
    dispatch(deleteWord(id));
  },
  clearWordsState: () => {
    dispatch(clearWordsState());
  },
});

const mapStateToProps = state => ({
  dataSource: state.words.dataSource,
});

export default connect(mapStateToProps, mapDispatchToProps)(WrappedWordsTable);
